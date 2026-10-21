/**
 * BLACKZONE V30: a real escort objective is independent of the release input.
 * A valid evacuation must follow at least 1.2m of actual hostage walking,
 * having been outside the extraction area, and requires a player to escort
 * them back to the marked entry. This prevents same-frame instant victories.
 */
export function beginEscort(position,now){
 const r=Math.hypot(position?.x||0,position?.z||0);
 return{startedAt:now,previous:{x:position.x,z:position.z},
  travelled:0,maxEntryDistance:r,leftEntry:r>2.15};
}
export function updateEscort(state,position,player,now){
 if(!state||!position||!player)return{complete:false,reason:'missing'};
 const r=Math.hypot(position.x,position.z);
 const move=Math.hypot(position.x-state.previous.x,position.z-state.previous.z);
 // Reject tracking jumps as rescue progress; footsteps count, teleports don't.
 if(move<=.24)state.travelled+=move;
 state.previous={x:position.x,z:position.z};
 state.maxEntryDistance=Math.max(state.maxEntryDistance,r);
 if(r>2.15)state.leftEntry=true;
 const age=Math.max(0,now-state.startedAt);
 const playerDistance=Math.hypot(player.x,player.z);
 const farEnough=state.leftEntry&&state.travelled>=1.20;
 const complete=age>=4500&&farEnough&&r<=1.02&&playerDistance<=1.28;
 return{complete,reason:!state.leftEntry?'leave-entry':
    state.travelled<1.20?'not-escorted':
    age<4500?'too-early':
    r>1.02||playerDistance>1.28?'return-to-entry':'evacuated',
  age,travelled:state.travelled,hostageDistance:r,playerDistance};
}
