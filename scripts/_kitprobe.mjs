import { chromium } from "playwright"; import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const PUBLIC = "/sessions/confident-eloquent-allen/mnt/Code/sandbox-spike-assets/public";
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".json":"application/json",".webp":"image/webp",".png":"image/png",".hdr":"application/octet-stream",".txt":"text/plain",".css":"text/css"};
const srv=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(PUBLIC,u==="/"?"/kit-contact-sheet.html":u);
  if(!f.startsWith(PUBLIC)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end("nf")}
  r.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream","cache-control":"no-store"});fs.createReadStream(f).pipe(r)});
await new Promise(r=>srv.listen(0,r)); const port=srv.address().port;
const b=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--enable-webgl","--no-sandbox"]});
const pg=await b.newPage({viewport:{width:1600,height:900}});
const errs=[],logs=[];
pg.on("pageerror",e=>errs.push(String(e).slice(0,220)));
pg.on("console",m=>{ if(m.type()==="error") errs.push("CONSOLE "+m.text().slice(0,200)); else logs.push(m.text().slice(0,120)); });
await pg.goto(`http://127.0.0.1:${port}/kit-contact-sheet.html`,{waitUntil:"load",timeout:120000});
await pg.waitForTimeout(9000);
console.log("PAGE ERRORS:", errs.length ? errs.slice(0,6) : "none");
console.log("first logs:", logs.slice(0,6));
console.log(JSON.stringify(await pg.evaluate(()=>{
  const cs=[...document.querySelectorAll("canvas")].map(c=>({w:c.width,h:c.height}));
  const g=window.__scene||window.scene||null;
  let meshes=0, verts=0;
  if(g&&g.traverse) g.traverse(o=>{ if(o.isMesh){meshes++; verts+=o.geometry?.attributes?.position?.count||0;} });
  return { canvases:cs, sceneFound:!!g, meshes, verts,
           bodyTextLen:document.body.innerText.trim().length,
           firstText:document.body.innerText.trim().slice(0,180) };
}),null,1));
const png = await pg.evaluate(()=>{ const c=document.querySelector("canvas"); return c?c.toDataURL("image/png"):null; });
if(png) fs.writeFileSync("/tmp/kit.png", Buffer.from(png.split(",")[1],"base64"));
await pg.screenshot({path:"/tmp/kit-page.png"}).catch(()=>{});
await b.close(); srv.close();
