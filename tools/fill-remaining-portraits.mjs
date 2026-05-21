import fs from 'node:fs/promises';
import path from 'node:path';
import { mapOrder, mapsById } from '../content/index.js';

const exts=['png','jpg','jpeg','webp'];
const bases={
  fish:['https://cloversalad.com/fishPortraits/'],
  creature:['https://cloversalad.com/creaturesPortraits/','https://cloversalad.com/creaturePortraits/'],
  item:['https://cloversalad.com/trashPortraits/']
};

async function isImage(file){
  try{const b=await fs.readFile(file); return b.length>4 && !(b.slice(0,64).toString().toLowerCase().includes('<!doctype html'));}
  catch{return false;}
}

async function tryDownload(url,file){
  try{
    const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(8000)});
    if(!r.ok) return false;
    const ct=(r.headers.get('content-type')||'').toLowerCase();
    const b=Buffer.from(await r.arrayBuffer());
    if(ct.includes('text/html') || b.slice(0,128).toString().toLowerCase().includes('<!doctype html')) return false;
    await fs.mkdir(path.dirname(file),{recursive:true});
    await fs.writeFile(file,b);
    return true;
  }catch{return false;}
}

let fixed=0;
for(const id of mapOrder){
  const map=mapsById[id];
  let changed=false;
  for(const e of map.entities||[]){
    if(e.category!=='creature' && e.category!=='item') continue;
    const p=e.image?.replace(/^\.\//,'');
    if(await isImage(p)) continue;
    let done=false;
    for(const base of bases[e.category]||[]){
      for(const ext of exts){
        const url=`${base}${e.id}.${ext}`;
        const out=`assets/portraits/${e.category}/${e.id}.${ext}`;
        if(await tryDownload(url,out)){
          e.image=`./${out}`;
          done=true; fixed++; changed=true; break;
        }
      }
      if(done) break;
    }
  }
  if(changed){
    const varName=id.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())+'Map';
    await fs.writeFile(`content/maps/${id}.js`, `export const ${varName} = ${JSON.stringify(map,null,2)};\n`);
    console.log('updated',id);
  }
}
console.log('fixed',fixed);
