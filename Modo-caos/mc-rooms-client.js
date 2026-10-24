'use strict';
/**
 * MODO CAOS — shared multiplayer client v2.
 * Every action is authenticated by Supabase Auth and scoped on server via mc_* RPC.
 * Realtime topic "mc-room:<uuid>" is used only as private:true and subject
 * to membership policy on realtime.messages. This does NOT align physical AR worlds.
 */
(function (root) {
  const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const ROOM=/^[A-F0-9]{8}$/;
  const GAME=/^[a-z][a-z0-9-]{1,63}$/;
  const check=(value,label,max=40)=>{
    if(typeof value!=='string'||!value.trim()||value.trim().length>max)throw new Error(label+': valor inválido');
    return value.trim();
  };
  const getId=x=>{const v=check(x,'Sala',36);if(!UUID.test(v))throw new Error('Identificador de sala inválido');return v.toLowerCase()};
  function createClient(supabase){
    if(!supabase||typeof supabase.rpc!=='function'||!supabase.auth||typeof supabase.channel!=='function'){
      throw new Error('Modo Caos necesita supabase-js v2');
    }
    let loggingIn=null;
    async function ensureAuth(){
      const {data,error}=await supabase.auth.getSession();
      if(error)throw error;
      if(data?.session?.user?.id&&data.session.access_token)return data.session;
      if(loggingIn)return loggingIn;
      loggingIn=(async()=>{
        const {data:auth,error:failure}=await supabase.auth.signInAnonymously({
          options:{data:{app:'modo_caos',client_version:'rooms-v2'}}
        });
        if(failure){
          const e=new Error('No se pudo iniciar sesión como invitado: '+(failure.message||'error desconocido')+'. Comprobá Anonymous Sign-Ins y volvé a intentar.');
          e.code='ANONYMOUS_AUTH_FAILED';e.cause=failure;
          throw e;
        }
        if(!auth?.session?.user?.id)throw new Error('Supabase no devolvió una sesión válida');
        return auth.session;
      })();
      try{return await loggingIn}finally{loggingIn=null}
    }
    async function call(name,params){
      await ensureAuth();
      const {data,error}=await supabase.rpc('mc_'+name,params);
      if(error)throw error;
      return data;
    }
    const emitSafe=(fn,...args)=>{try{if(typeof fn==='function')fn(...args)}catch(e){console.warn('MC listener:',e)}};
    return Object.freeze({
      ensureAuth,
      async userId(){return(await ensureAuth()).user.id},
      async createRoom(slug,name='Anfitrión',maxPlayers=4){
        slug=check(slug,'Juego',64);name=check(name,'Nombre',24);
        if(!GAME.test(slug))throw new Error('Nombre de juego inválido');
        if(!Number.isInteger(maxPlayers)||maxPlayers<2||maxPlayers>4)throw new Error('Elegí 2, 3 o 4 jugadores');
        const rows=await call('create_room',{p_game_slug:slug,p_display_name:name,p_max_players:maxPlayers});
        if(!rows?.[0]?.room_id||!ROOM.test(rows[0].room_code))throw new Error('La sala no se pudo crear');
        return rows[0];
      },
      async joinRoom(code,name='Jugador'){
        const formatted=check(code,'Código',8).toUpperCase();name=check(name,'Nombre',24);
        if(!ROOM.test(formatted))throw new Error('El código debe tener ocho letras o números');
        const rows=await call('join_room',{p_code:formatted,p_display_name:name});
        if(!rows?.[0]?.room_id)throw new Error('No se pudo entrar');
        return rows[0];
      },
      async resumeRoom(code){
        const formatted=check(code,'Código',8).toUpperCase();
        if(!ROOM.test(formatted))throw new Error('Código inválido');
        const rows=await call('resume_room',{p_code:formatted});
        return rows?.[0]||null;
      },
      async setReady(roomId,ready=true){return call('set_ready',{p_room_id:getId(roomId),p_ready:!!ready})},
      async getRoom(roomId){return call('get_room',{p_room_id:getId(roomId)})},
      async startRoom(roomId){return call('start_room',{p_room_id:getId(roomId)})},
      async finishRoom(roomId){return call('finish_room',{p_room_id:getId(roomId)})},
      async leaveRoom(roomId){return call('leave_room',{p_room_id:getId(roomId)})},
      async heartbeat(roomId){return call('heartbeat',{p_room_id:getId(roomId)})},
      async connectRoom(roomId,opts={}){
        roomId=getId(roomId);
        const session=await ensureAuth();
        if(typeof supabase.realtime?.setAuth==='function'){
          supabase.realtime.setAuth(session.access_token);
        }
        let connected=false,closed=false;
        const topic='mc-room:'+roomId;
        const channel=supabase.channel(topic,{config:{
          private:true,
          presence:{key:session.user.id},
          broadcast:{self:false}
        }});
        channel.on('broadcast',{event:'mc-refresh'},payload=>emitSafe(opts.onRefresh,payload?.payload))
          .on('broadcast',{event:'mc-pulse'},payload=>emitSafe(opts.onPulse,payload?.payload))
          .on('broadcast',{event:'mc-game'},payload=>emitSafe(opts.onGameEvent,payload?.payload))
          .on('presence',{event:'sync'},()=>emitSafe(opts.onPresence,channel.presenceState()));
        channel.subscribe(async(status,err)=>{
          if(closed)return;
          connected=status==='SUBSCRIBED';
          emitSafe(opts.onStatus,status,err);
          if(connected){
            try{await channel.track({userId:session.user.id,at:Date.now()})}
            catch(e){emitSafe(opts.onStatus,'TRACK_FAILED',e)}
            emitSafe(opts.onRefresh,{source:'connected'});
          }
        });
        async function send(event,payload={}){
          if(closed)throw new Error('Sala desconectada');
          if(!connected)throw new Error('Reconectando sala…');
          if(JSON.stringify(payload).length>2400)throw new Error('Mensaje demasiado grande');
          const result=await channel.send({type:'broadcast',event,payload});
          if(result!=='ok')throw new Error('No se entregó el mensaje: '+result);
          return result;
        }
        return Object.freeze({
          topic,
          get connected(){return connected&&!closed},
          notify:()=>send('mc-refresh',{at:Date.now()}),
          pulse:()=>send('mc-pulse',{at:Date.now(),userId:session.user.id}),
          sendGameEvent:payload=>send('mc-game',{...payload,userId:session.user.id}),
          async close(){
            if(closed)return;closed=true;connected=false;
            try{await channel.untrack()}catch(e){}
            await supabase.removeChannel(channel);
          }
        });
      }
    });
  }
  root.ModoCaosRooms=Object.freeze({createClient});
})(typeof window!=='undefined'?window:globalThis);
