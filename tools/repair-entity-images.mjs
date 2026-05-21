import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { mapOrder, mapsById } from '../data/maps/index.js';

function isImageFile(p){
  try{
    const out=execSync(`file -b ${JSON.stringify(p)}`).toString().toLowerCase();
    return out.includes('image')||out.includes('png')||out.includes('jpeg')||out.includes('web/p')||out.includes('gif');
  }catch{return false;}
}

function varName(id){ return id.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())+'Map'; }

let replaced=0;
for(const id of mapOrder){
  const map=mapsById[id];
  let changed=false;
  for(const e of map.entities||[]){
    const img=e.image?.replace(/^\.\//,'');
    const alt=e.altImage?.replace(/^\.\//,'');
    const imgOk=img?isImageFile(img):false;
    if(!imgOk && alt && isImageFile(alt)){
      e.image=e.altImage;
      changed=true;
      replaced++;
    }
  }
  if(changed){
    const out=`export const ${varName(id)} = ${JSON.stringify(map,null,2)};\n`;
    await fs.writeFile(path.join('data/maps',`${id}.js`),out);
    console.log('updated',id);
  }
}
console.log('replaced',replaced);
