/**
 * BLACKZONE V21 — lightweight, host-side tactical cover behavior.
 * Plans use ONLY obstacles marked by the host. No automatic furniture recognition.
 */
export function tacticalDestination(actor,time,objective,threat,findCover,enabled=true){
 if(!actor?.alive||!objective||!threat||!enabled||typeof findCover!=='function'){
   if(actor){actor.coverPlan=null;actor.coverState=null;}
   return objective;
 }
 const point=actor.root.position,dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
 const range=dist(point,threat);
 if(range<1.5||range>8.1){actor.coverPlan=null;actor.coverState=null;return objective;}
 let plan=actor.coverPlan;
 if(plan&&(time>plan.expires||dist(plan.threat,threat)>1.55)){actor.coverPlan=null;plan=null;}
 if(!plan&&time>=(actor.coverRetryAt||0)){
   actor.coverRetryAt=time+2800+(Math.abs(actor.id||0)%4)*210;
   const positions=findCover(point,threat);
   if(positions?.hide&&positions?.peek){
     plan={hide:positions.hide,peek:positions.peek,threat:{x:threat.x,z:threat.z},
       state:'approach',until:0,expires:time+22000};
     actor.coverPlan=plan;
   }
 }
 if(!plan){actor.coverState=null;return objective;}
 const dHide=dist(point,plan.hide),dPeek=dist(point,plan.peek);
 if(plan.state==='approach'&&dHide<.32){plan.state='hold';plan.until=time+480;}
 if(plan.state==='hold'&&time>plan.until)plan.state='peek';
 if(plan.state==='peek'&&dPeek<.32){plan.state='fire';plan.until=time+950+(Math.abs(actor.id||0)%3)*150;}
 if(plan.state==='fire'&&time>plan.until)plan.state='retreat';
 if(plan.state==='retreat'&&dHide<.36){plan.state='hold';plan.until=time+620;}
 actor.coverState=plan.state;
 actor.tacticalThreat=threat;
 return plan.state==='peek'||plan.state==='fire'?plan.peek:plan.hide;
}
