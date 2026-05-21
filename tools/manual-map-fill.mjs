import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { mapOrder, mapsById } from '../data/maps/index.js';

const mapPages = {
  'marina': 'Map:Home Island',
  'paradise-island': 'Map:Paradise Island',
  'great-lakes': 'Map:Great Lakes',
  'costa-rica': 'Map:Costa Rica',
  'alaska': 'Map:Alaska',
  'australia': 'Map:Australia',
  'scotland': 'Map:Scotland',
  'thailand': 'Map:Thailand',
  'amazon': 'Map:Amazon',
  'chemical-plant': 'Map:Chemical Plant',
  'nuclear-plant': 'Map:Nuclear Plant',
  'petrochemical-zone': 'Map:Petrochemical Zone',
  'bermuda-triangle': 'Map:Bermuda Triangle'
};

const overrides = {
  't0-6': 'striped beach shell',
  't0-13': 'tourist brochure-paradise island',
  't0-17': 'tourist brochure-australia',
  'c0-2': 'flower tube sea anemone',
  't2-6': 'brown floppy disk',
  't2-11': 'cobra sunglasses',
  't2-16': 'green floppy disk',
  't2-17': 'grey cassette',
  't2-30': 'withered leaf',
  'c3-11': 'narwhal',
  't4-23': 'thick floppy disk',
  't6-27': 'wooden barrel',
  't6-28': 'tourist camera',
  'c6-7': 'irrawaddy dolphin',
  't9-5': 'glowing crystal'
};

function norm(s){return String(s||'').toLowerCase().normalize('NFKD').replace(/[’'"“”()\-_/.,]/g,' ').replace(/\s+/g,' ').trim();}
function normLoose(s){return norm(s).replace(/[^a-z0-9 ]/g,'');}
function varName(id){ return id.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())+'Map'; }

function lev(a,b){
  const m=a.length,n=b.length; const d=Array.from({length:m+1},()=>Array(n+1).fill(0));
  for(let i=0;i<=m;i++) d[i][0]=i; for(let j=0;j<=n;j++) d[0][j]=j;
  for(let i=1;i<=m;i++) for(let j=1;j<=n;j++){
    const c=a[i-1]===b[j-1]?0:1;
    d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+c);
  }
  return d[m][n];
}

async function fetchJson(url){
  const res=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(15000)});
  if(!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

function isImage(p){
  try{
    const out=execSync(`file -b ${JSON.stringify(p.replace(/^\.\//,''))}`).toString().toLowerCase();
    return out.includes('image')||out.includes('png')||out.includes('jpeg')||out.includes('web/p')||out.includes('gif');
  }catch{return false;}
}

async function resolveFileUrl(fileTitle){
  const api=`https://creatures-of-the-deep-app.fandom.com/api.php?action=query&titles=${encodeURIComponent(`File:${fileTitle}`)}&prop=imageinfo&iiprop=url&format=json`;
  const j=await fetchJson(api); const pages=j?.query?.pages||{};
  for(const p of Object.values(pages)){ const u=p?.imageinfo?.[0]?.url; if(u) return u; }
  return null;
}

async function download(url, out){
  const res=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(12000)});
  if(!res.ok) return false;
  const ct=(res.headers.get('content-type')||'').toLowerCase();
  const b=Buffer.from(await res.arrayBuffer());
  if(ct.includes('text/html') || b.slice(0,128).toString().toLowerCase().includes('<!doctype html')) return false;
  await fs.mkdir(path.dirname(out),{recursive:true});
  await fs.writeFile(out,b);
  return true;
}

let fixed=0;
for(const id of mapOrder){
  const map=mapsById[id];
  if(!mapPages[id]) continue;
  const target=(map.entities||[]).filter(e=>(e.category==='creature'||e.category==='item') && !isImage(e.image||''));
  if(!target.length) continue;

  const api=`https://creatures-of-the-deep-app.fandom.com/api.php?action=parse&page=${encodeURIComponent(mapPages[id])}&prop=wikitext&format=json`;
  const pj=await fetchJson(api);
  if(pj.error) continue;
  const mj=JSON.parse(pj.parse.wikitext['*']);
  const cats=(mj.categories||[]).filter(c=>c.icon);
  const cands=cats.map(c=>({name:c.name, key:normLoose(c.name), icon:String(c.icon).replace(/^File:/i,'')}));

  let changed=false;
  for(const e of target){
    const key = overrides[e.id.toLowerCase()] || e.mapCategory || e.name;
    const nk = normLoose(key);

    let best=null;
    for(const c of cands){
      const dist=lev(nk,c.key);
      const score=dist/Math.max(1,nk.length,c.key.length);
      if(!best || score<best.score) best={c,score};
    }

    if(!best || best.score>0.45) continue;
    const url=await resolveFileUrl(best.c.icon);
    if(!url) continue;
    const ext=(best.c.icon.split('.').pop()||'png').toLowerCase();
    const out=`assets/portraits-mapicons/${id}/${e.id}.${ext}`;
    const ok=await download(url,out);
    if(!ok) continue;
    e.altImage=`./${out}`;
    e.image=e.altImage;
    fixed++; changed=true;
  }

  if(changed){
    await fs.writeFile(`data/maps/${id}.js`, `export const ${varName(id)} = ${JSON.stringify(map,null,2)};\n`);
    console.log('updated',id);
  }
}
console.log('fixed',fixed);
