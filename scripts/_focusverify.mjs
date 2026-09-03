import { chromium } from "playwright"; import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const PUBLIC="/sessions/confident-eloquent-allen/mnt/Code/sandbox-spike/public";
const M={".html":"text/html",".js":"text/javascript",".json":"application/json",".webp":"image/webp",".png":"image/png",".hdr":"application/octet-stream",".txt":"text/plain",".css":"text/css"};
const s=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(PUBLIC,u==="/"?"/index.html":u==="/world-source"?"/sim-baseline.generated.js":u);
 if(!f.startsWith(PUBLIC)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end("nf")}
 r.writeHead(200,{"content-type":M[path.extname(f)]||"application/octet-stream","cache-control":"no-store"});fs.createReadStream(f).pipe(r)});
await new Promise(r=>s.listen(0,r)); const p=s.address().port;
const b=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--enable-webgl","--no-sandbox"]});
const pg=await b.newPage({viewport:{width:960,height:540}});
await pg.goto(`http://127.0.0.1:${p}/?pdb=1`,{waitUntil:"load",timeout:180000});
await pg.waitForFunction("window.__ready === true",null,{timeout:300000});
await pg.evaluate(()=>{for(let i=0;i<4;i++)window.__tick(0.016)});
console.log(JSON.stringify(await pg.evaluate(()=>{
  const impl=window.renderer3d._impl;
  const before={dist:Math.round(impl._camDist), target:Math.round(impl._targetCamDist)};
  const r=window.renderer3d.focusAtScreen(480,300);
  return { sceneChildren:window.__scene.children.length,
           neighbourhoodChildren:impl.neighbourhoodGroup.children.length,
           before, focus:r,
           targetAfter:Math.round(impl._targetCamDist),
           markerCreated:!!impl._pivotMarker,
           markerAt:impl._pivotMarker?{x:Math.round(impl._pivotMarker.position.x),z:Math.round(impl._pivotMarker.position.z)}:null };
})));
await b.close(); s.close();
