import fs from 'node:fs/promises';
import path from 'node:path';
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

function norm(s){ return String(s||'').toLowerCase().replace(/[^a-z0-9]/g,''); }
function varName(id){ return id.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())+'Map'; }
function fileTitle(icon){ return String(icon||'').replace(/^File:/i,'').trim(); }

async function fetchJson(url){
  const res = await fetch(url,{headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(20000)});
  if(!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function dl(url,file){
  try { await fs.access(file); return true; } catch {}
  try{
    const res=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(12000)});
    if(!res.ok) return false;
    const b=Buffer.from(await res.arrayBuffer());
    await fs.mkdir(path.dirname(file),{recursive:true});
    await fs.writeFile(file,b);
    return true;
  }catch{return false;}
}

for (const id of mapOrder){
  const map = mapsById[id];
  if(!mapPages[id] || !Array.isArray(map.entities) || map.entities.length===0) continue;

  const api = `https://creatures-of-the-deep-app.fandom.com/api.php?action=parse&page=${encodeURIComponent(mapPages[id])}&prop=wikitext&format=json`;
  const parsed = await fetchJson(api);
  if(parsed.error) continue;
  const mapJson = JSON.parse(parsed.parse.wikitext['*']);
  const cats = Array.isArray(mapJson.categories)?mapJson.categories:[];
  const byName = new Map(cats.map(c=>[norm(c.name), c]));

  const titleByEntity = new Map();
  for(const e of map.entities){
    if(e.altImage) continue;
    const c = byName.get(norm(e.name));
    const t = fileTitle(c?.icon);
    if(t) titleByEntity.set(e.id,t);
  }

  const uniqueTitles = [...new Set([...titleByEntity.values()])];
  const urlByTitle = new Map();
  for(let i=0;i<uniqueTitles.length;i+=30){
    const chunk = uniqueTitles.slice(i,i+30);
    const titlesParam = chunk.map(t=>`File:${t}`).join('|');
    const q = `https://creatures-of-the-deep-app.fandom.com/api.php?action=query&titles=${encodeURIComponent(titlesParam)}&prop=imageinfo&iiprop=url&format=json`;
    const j = await fetchJson(q);
    const pages = j?.query?.pages||{};
    for(const p of Object.values(pages)){
      const title = String(p?.title||'').replace(/^File:/,'');
      const u = p?.imageinfo?.[0]?.url;
      if(title && u) urlByTitle.set(title,u);
    }
  }

  let changed = false;
  for(const e of map.entities){
    if(e.altImage) continue;
    const t = titleByEntity.get(e.id);
    if(!t) continue;
    const url = urlByTitle.get(t);
    if(!url) continue;
    const ext = (t.split('.').pop()||'png').toLowerCase();
    const local = `assets/portraits-mapicons/${id}/${e.id}.${ext}`;
    const ok = await dl(url, local);
    if(!ok) continue;
    e.altImage = `./${local}`;
    changed = true;
  }

  if(changed){
    const out = `export const ${varName(id)} = ${JSON.stringify(map,null,2)};\n`;
    await fs.writeFile(`data/maps/${id}.js`, out);
    console.log('updated',id);
  }
}
