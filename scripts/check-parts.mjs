import { generateWorld, PLOT_CLASSES, SETTLEMENTS } from "../public/city-plan.js";
import { LandField, makeHeightAt } from "../public/terrain.js";
import { createCollector, emitBuilding, HEIGHT, rnd } from "../public/buildings.js";
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const field=new LandField(16), heightAt=makeHeightAt(field);
const world=generateWorld();
const SETT=[{id:"downtown",cx:0,cz:40,r:1500},...SETTLEMENTS.map(s=>({id:s.id,cx:(s.bounds.xMin+s.bounds.xMax)/2,cz:(s.bounds.zMin+s.bounds.zMax)/2,r:Math.max(s.bounds.xMax-s.bounds.xMin,s.bounds.zMax-s.bounds.zMin)/2}))];
const coll=createCollector();
for(const p of world.plots){
  const cls=p.className; if(!HEIGHT[cls]||cls==="PARK") continue;
  const bw=Math.max(3,p.buildable.xMax-p.buildable.xMin), bd=Math.max(3,p.buildable.zMax-p.buildable.zMin);
  const cx=(p.buildable.xMin+p.buildable.xMax)/2, cz=(p.buildable.zMin+p.buildable.zMax)/2;
  const g=heightAt(cx,cz); if(g<0.6) continue;
  const hs=[heightAt(p.xMin,p.zMin),heightAt(p.xMax,p.zMin),heightAt(p.xMin,p.zMax),heightAt(p.xMax,p.zMax)];
  const gRange=Math.max(...hs)-Math.min(...hs);
  const s=SETT.find(q=>q.id===(p.settlement||"downtown"));
  let central=1; if(s){const dd=Math.hypot(cx-s.cx,cz-s.cz)/(s.r||1); central=0.42+0.58*Math.pow(clamp(1-dd,0,1),0.75);}
  let h=HEIGHT[cls](rnd(p.id))*(cls==="FARM"||cls==="HANGAR"?1:central);
  const cap=PLOT_CLASSES[cls]&&PLOT_CLASSES[cls].maxHeight; if(cap) h=Math.min(h,cap); if(h<4) h=4;
  emitBuilding(coll,cls,p.id,cx,cz,bw,bd,h,g,gRange);
}
let bad=0, worst=[];
for(const k in coll.buckets){
  const a=coll.buckets[k]; const n=a.length/8;
  let mnS=Infinity,mxS=-Infinity,mnY=Infinity,mxY=-Infinity,nan=0;
  for(let i=0;i<n;i++){const o=i*8;
    for(let j=0;j<7;j++) if(!Number.isFinite(a[o+j])) nan++;
    const sx=a[o+3],sy=a[o+4],sz=a[o+5];
    mnS=Math.min(mnS,sx,sy,sz); mxS=Math.max(mxS,sx,sy,sz);
    mnY=Math.min(mnY,a[o+1]); mxY=Math.max(mxY,a[o+1]);
    if(sx>2000||sy>2000||sz>2000||sx<=0||sy<=0||sz<=0){bad++; if(worst.length<8) worst.push([k,i,sx.toFixed(1),sy.toFixed(1),sz.toFixed(1),a[o+1].toFixed(1)]);}
  }
  console.log(k.padEnd(8), String(n).padStart(6), "scale", mnS.toFixed(2), "..", mxS.toFixed(1), " y", mnY.toFixed(0), "..", mxY.toFixed(0), nan?("NaN="+nan):"");
}
console.log("total parts", coll.count(), " suspicious", bad); console.log(worst);
