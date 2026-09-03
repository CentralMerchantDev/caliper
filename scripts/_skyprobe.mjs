import { chromium } from "playwright"; import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const PUBLIC="/sessions/confident-eloquent-allen/mnt/Code/sandbox-spike/public";
const M={".html":"text/html",".js":"text/javascript",".json":"application/json",".webp":"image/webp",".png":"image/png",".hdr":"application/octet-stream",".txt":"text/plain",".css":"text/css"};
const s=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(PUBLIC,u==="/"?"/city.html":u==="/world-source"?"/sim-baseline.generated.js":u);
 if(!f.startsWith(PUBLIC)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end("nf")}
 r.writeHead(200,{"content-type":M[path.extname(f)]||"application/octet-stream","cache-control":"no-store"});fs.createReadStream(f).pipe(r)});
await new Promise(r=>s.listen(0,r)); const p=s.address().port;
const b=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--enable-webgl","--no-sandbox"]});
const pg=await b.newPage({viewport:{width:1400,height:800}});
const errs=[]; pg.on("pageerror",e=>errs.push(String(e).slice(0,200)));
pg.on("console",m=>{ if(m.type()==="error") errs.push("CONSOLE "+m.text().slice(0,160)); });
await pg.goto(`http://127.0.0.1:${p}/city.html?bare=1&dpr=1`,{waitUntil:"load",timeout:120000});
await pg.waitForFunction("window.__ready === true",null,{timeout:240000});
console.log("ERRORS:", errs.length?errs.slice(0,4):"none");
console.log(JSON.stringify(await pg.evaluate(()=>{
  const W = window.__world, sc = window.__scene;
  const heightAt = W.heightAt;
  // Every InstancedMesh in the scene, its instance positions read back from the
  // matrices, and how many of them stand on ground that is under water.
  const out = { meshes: [], benchesOnWater: 0, totalOnWater: 0 };
  const m4 = new W.THREE.Matrix4(), v3 = new W.THREE.Vector3();
  sc.traverse((o) => {
    if (!o.isInstancedMesh || !o.count) return;
    let onWater = 0, minY = Infinity, sample = null;
    for (let i = 0; i < o.count; i++) {
      o.getMatrixAt(i, m4);
      v3.setFromMatrixPosition(m4);
      const g = heightAt(v3.x, v3.z);
      if (g < 0.0) { onWater++; if (!sample) sample = [Math.round(v3.x), Math.round(v3.z), Number(g.toFixed(2))]; }
      if (v3.y < minY) minY = v3.y;
    }
    if (onWater > 0) {
      out.meshes.push({ name: o.name || "(unnamed)", count: o.count, onWater, sample });
      out.totalOnWater += onWater;
    }
  });
  out.propRefused = W.stats && W.stats.propRefused;
  out.note = "onWater = terrain height BELOW sea level, i.e. genuinely submerged";
  return out;
}),null,1));
await b.close(); s.close();
