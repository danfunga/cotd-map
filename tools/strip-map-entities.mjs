import fs from 'node:fs/promises';
import path from 'node:path';
import { mapOrder, mapsById } from '../content/index.js';

const defs = [
  { id: '01_marina', file: 'marina.js', exportName: 'marinaMap' },
  { id: '02_paradise-island', file: 'paradise-island.js', exportName: 'paradiseIslandMap' },
  { id: '03_great-lakes', file: 'great-lakes.js', exportName: 'greatLakesMap' },
  { id: '04_costa-rica', file: 'costa-rica.js', exportName: 'costaRicaMap' },
  { id: '05_alaska', file: 'alaska.js', exportName: 'alaskaMap' },
  { id: '06_australia', file: 'australia.js', exportName: 'australiaMap' },
  { id: '07_scotland', file: 'scotland.js', exportName: 'scotlandMap' },
  { id: '08_thailand', file: 'thailand.js', exportName: 'thailandMap' },
  { id: '09_amazon', file: 'amazon.js', exportName: 'amazonMap' },
  { id: 'v1_chemical-plant', file: 'chemical-plant.js', exportName: 'chemicalPlantMap' },
  { id: 'v2_nuclear-plant', file: 'nuclear-plant.js', exportName: 'nuclearPlantMap' },
  { id: 'v3_petrochemical', file: 'petrochemical.js', exportName: 'petrochemicalMap' },
  { id: 'v4_bermuda-triangle', file: 'bermuda-triangle.js', exportName: 'bermudaTriangleMap' }
];

for (const def of defs) {
  const map = mapsById[def.id];
  if (!map) continue;

  const out = {
    id: map.id,
    name: map.name,
    imagePath: map.imagePath,
    imageWidth: map.imageWidth,
    imageHeight: map.imageHeight,
    dataPath: `./assets/maps/${map.id}`
  };

  const content = `export const ${def.exportName} = ${JSON.stringify(out, null, 2)};\n`;
  await fs.writeFile(path.join('content', 'maps', def.file), content);
}

console.log(`Stripped entities from ${mapOrder.length} maps.`);
