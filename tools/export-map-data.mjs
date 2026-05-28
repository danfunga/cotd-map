import fs from 'node:fs/promises';
import path from 'node:path';
import { mapOrder, mapsById } from '../content/index.js';

function byCategories(entities, categories) {
  const allow = new Set(categories);
  return entities.filter((entity) => allow.has(entity?.category));
}

async function main() {
  for (const mapId of mapOrder) {
    const map = mapsById[mapId];
    if (!map) continue;

    const entities = Array.isArray(map.entities) ? map.entities : [];
    const fish = byCategories(entities, ['fish', 'monster']);
    const creature = byCategories(entities, ['creature']);
    const item = byCategories(entities, ['item']);

    const dataDir = path.join('assets', 'maps', mapId, 'data');
    await fs.mkdir(dataDir, { recursive: true });

    await fs.writeFile(path.join(dataDir, 'fish.json'), `${JSON.stringify(fish, null, 2)}\n`);
    await fs.writeFile(path.join(dataDir, 'creature.json'), `${JSON.stringify(creature, null, 2)}\n`);
    await fs.writeFile(path.join(dataDir, 'item.json'), `${JSON.stringify(item, null, 2)}\n`);
  }

  console.log(`Exported map data for ${mapOrder.length} maps.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
