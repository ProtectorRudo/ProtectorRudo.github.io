/**
 * La Casa Alterada V9 - assisted room mapping, collision and line-of-sight.
 * Original code informed by YUKA and three-pathfinding concepts (no code copied).
 * The browser cannot infer doors, walls and semantic furniture with certainty.
 * V9 stores only confirmed sample points and explicit user-drawn segments.
 */
export function createSpatialMap(THREE,scene){
  const walls=[],boxes=[],dynamic=[],debug=[];
  const V=(p)=>({x:p.x,y:p.y,z:p.z});
  const len=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  const cross=(a,b,c)=> (b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
  function intersects2D(a,b,c,d){
    const r=cross(a,b,c),s=cross(a,b,d),u=cross(c,d,a),v=cross(c,d,b);
    if(Math.abs(r)<.0001&&Math.abs(s)<.0001)return false;
    return (r*s<=0&&u*v<=0);
  }
  function distanceSegment(p,a,b){
    const dx=b.x-a.x,dz=b.z-a.z;
    const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));
    return Math.hypot(p.x-(a.x+dx*t),p.z-(a.z+dz*t));
  }
  function addWall(a,b,opt={}){
    if(!a||!b||len(a,b)<.30||len(a,b)>12||walls.length>=28)return false;
    const floorY=Number.isFinite(opt.floorY)?opt.floorY:Math.min(a.y,b.y);
    const height=Math.max(1.2,Math.min(3.4,opt.height||2.35));
    const A=V(a),B=V(b);
    A.y=floorY;B.y=floorY;
    const angle=Math.atan2(B.x-A.x,B.z-A.z);
    const g=new THREE.BoxGeometry(.13,height,len(A,B)),m=new THREE.MeshBasicMaterial({color:0x69cdd0,transparent:true,opacity:.12,depthWrite:false,side:THREE.DoubleSide});
    const mesh=new THREE.Mesh(g,m);mesh.position.set((A.x+B.x)/2,floorY+height/2,(A.z+B.z)/2);mesh.rotation.y=angle;scene.add(mesh);debug.push(mesh);
    const wall={id:walls.length+1,type:'wall',a:A,b:B,base:floorY,top:floorY+height,thickness:.16,mesh};
    walls.push(wall);return wall;
  }
  function addBox(a,b,opt={}){
    if(!a||!b||boxes.length>=20)return false;
    const A=V(a),B=V(b),dx=Math.abs(A.x-B.x),dz=Math.abs(A.z-B.z);
    if(Math.max(dx,dz)<.22)return false;
    const floorY=Number.isFinite(opt.floorY)?opt.floorY:Math.min(A.y,B.y),height=Math.max(.2,Math.min(2.5,opt.height||.95));
    const minX=Math.min(A.x,B.x)-.06,maxX=Math.max(A.x,B.x)+.06,minZ=Math.min(A.z,B.z)-.06,maxZ=Math.max(A.z,B.z)+.06;
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(maxX-minX,height,maxZ-minZ),new THREE.MeshBasicMaterial({color:0xf0b972,transparent:true,opacity:.12,depthWrite:false}));
    mesh.position.set((minX+maxX)/2,floorY+height/2,(minZ+maxZ)/2);scene.add(mesh);debug.push(mesh);
    const box={type:'box',id:boxes.length+1,minX,maxX,minZ,maxZ,base:floorY,top:floorY+height,mesh};
    boxes.push(box);return box;
  }
  function touchesWall(p,r=.25){
    return walls.some(w=>p.y>=w.base-.55&&p.y<=w.top+.15&&distanceSegment(p,w.a,w.b)<r+w.thickness*.5)
      ||boxes.some(b=>p.y>=b.base-.45&&p.y<=b.top+.3&&p.x+r>b.minX&&p.x-r<b.maxX&&p.z+r>b.minZ&&p.z-r<b.maxZ);
  }
  function lineBlocked(a,b,padding=0){
    if(!a||!b)return false;
    for(const w of walls){
      if(Math.max(a.y,b.y)<w.base-.1||Math.min(a.y,b.y)>w.top+.1)continue;
      if(intersects2D(a,b,w.a,w.b)||distanceSegment(a,w.a,w.b)<padding||distanceSegment(b,w.a,w.b)<padding)return true;
    }
    for(const x of boxes){
      if(Math.max(a.y,b.y)<x.base||Math.min(a.y,b.y)>x.top)continue;
      // Liang-Barsky AABB clipping in horizontal plane
      const dx=b.x-a.x,dz=b.z-a.z;let enter=0,leave=1;
      for(const [p,d,min,max] of [[a.x,dx,x.minX-padding,x.maxX+padding],[a.z,dz,x.minZ-padding,x.maxZ+padding]]){
        if(Math.abs(d)<1e-6){if(p<min||p>max){enter=2;break}}
        else{const t0=(min-p)/d,t1=(max-p)/d;enter=Math.max(enter,Math.min(t0,t1));leave=Math.min(leave,Math.max(t0,t1))}
      }
      if(enter<=leave)return true;
    }
    return false;
  }
  function canMove(a,b,r=.22){
    if(!a||!b)return true;
    // Disallow clipping through thin walls during a large timestep or fast chase.
    if(lineBlocked(a,b,r*.4))return false;
    return !touchesWall(b,r);
  }
  function getRoute(from,to){
    if(!from||!to||!lineBlocked(from,to,.14))return [V(to)];
    const nodes=[V(from),V(to)];
    for(const w of walls){
      const dx=w.b.x-w.a.x,dz=w.b.z-w.a.z,l=Math.hypot(dx,dz)||1;
      const nx=-dz/l,nz=dx/l;
      for(const p of [w.a,w.b])for(const sign of [-1,1]){
        const c={x:p.x+nx*.42*sign,y:to.y,z:p.z+nz*.42*sign};
        if(!touchesWall(c,.16))nodes.push(c);
      }
    }
    for(const b of boxes){
      for(const x of [b.minX-.38,b.maxX+.38])for(const z of [b.minZ-.38,b.maxZ+.38]){
        const p={x,y:to.y,z};if(!touchesWall(p,.15))nodes.push(p);
      }
    }
    const dist=nodes.map(()=>Infinity),parents=nodes.map(()=>-1),seen=nodes.map(()=>false);dist[0]=0;
    for(let i=0;i<nodes.length;i++){
      let k=-1;
      for(let j=0;j<nodes.length;j++)if(!seen[j]&&(k===-1||dist[j]<dist[k]))k=j;
      if(k<0||!Number.isFinite(dist[k])||k===1)break;seen[k]=true;
      for(let j=1;j<nodes.length;j++)if(!seen[j]&&!lineBlocked(nodes[k],nodes[j],.11)){
        const nd=dist[k]+len(nodes[k],nodes[j]);if(nd<dist[j]){dist[j]=nd;parents[j]=k}
      }
    }
    if(!Number.isFinite(dist[1]))return [];
    const result=[];for(let k=1;k>0&&k!==-1;k=parents[k])result.unshift(V(nodes[k]));
    return result;
  }
  function nearestWaypoint(from,to){const route=getRoute(from,to);return route.length?route[0]:null}
  function exportData(origin){
    if(!origin)return[];
    const point=v=>{const p=origin.worldToLocal(new THREE.Vector3(v.x,v.y,v.z));return [+p.x.toFixed(2),+p.y.toFixed(2),+p.z.toFixed(2)]};
    return [...walls.map(w=>({type:'wall',a:point(w.a),b:point(w.b),height:w.top-w.base})),...boxes.map(w=>({type:'box',a:point({x:w.minX,y:w.base,z:w.minZ}),b:point({x:w.maxX,y:w.base,z:w.maxZ}),height:w.top-w.base}))];
  }
  function clear(){for(const o of debug){o.parent?.remove(o);o.geometry.dispose();o.material.dispose()}debug.length=0;walls.length=0;boxes.length=0}
  function importData(list,origin){
    if(!origin||!Array.isArray(list))return;clear();
    const pt=a=>origin.localToWorld(new THREE.Vector3(a[0],a[1],a[2]));
    for(const item of list.slice(0,32)){if(!Array.isArray(item?.a)||!Array.isArray(item?.b))continue;
      if(item.a.length!==3||item.b.length!==3||![...item.a,...item.b].every(n=>Number.isFinite(n)&&Math.abs(n)<35))continue;
      if(item.type==='wall')addWall(pt(item.a),pt(item.b),{height:item.height,floorY:pt(item.a).y});
      else if(item.type==='box')addBox(pt(item.a),pt(item.b),{height:item.height,floorY:pt(item.a).y});
    }
  }
  return {walls,boxes,addWall,addBox,lineBlocked,touchesWall,canMove,getRoute,nearestWaypoint,exportData,importData,clear};
}
