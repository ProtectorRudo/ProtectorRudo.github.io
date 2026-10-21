/** Pure multiplayer connection policy. All times use performance.now(). */
export const LINK={connectTimeout:15000,pingEvery:2600,pongTimeout:9500,maxRetries:8};
export function sessionCode(value){
 const text=String(value||'').trim().toUpperCase();
 return /^[A-Z0-9]{6}$/.test(text)?text:null;
}
export function retryDelay(attempt){
 return Math.min(14000,1200*Math.pow(1.58,Math.max(0,attempt-1)));
}
export function timedOutConnect(now,startedAt,open){
 return !open&&startedAt>0&&now-startedAt>LINK.connectTimeout;
}
export function lostHeartbeat(now,lastPong,connectedAt){
 return now-Math.max(lastPong||0,connectedAt||0)>LINK.pongTimeout;
}
export function linkErrorMessage(type){
 switch(type){
 case 'peer-unavailable':return 'SALA NO ENCONTRADA · REVISÁ CÓDIGO Y ANFITRIÓN';
 case 'unavailable-id':return 'EL CÓDIGO YA ESTÁ USADO · CREÁ OTRA SALA';
 case 'webrtc':return 'CONEXIÓN BLOQUEADA POR LA RED · PROBÁ AMBOS EN LA MISMA WIFI';
 case 'network':case 'socket-error':case 'socket-closed':
 return 'SIN SEÑAL DEL SERVIDOR · REVISÁ INTERNET';
 case 'timeout':return 'NO SE CONECTARON LOS CELULARES · PROBÁ LA MISMA WIFI';
 default:return 'CONEXIÓN INTERRUMPIDA · REINTENTANDO';
 }
}
