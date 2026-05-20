import fs from 'node:fs/promises';
import path from 'node:path';

const MAPS = [
  { id: 'marina', name: 'Marina', cloverSlug: 'marina', fandomPage: 'Home_Island', fandomFiles: ['HomeIsland2.jpg', 'Home_Island_map_(annotated).png', 'Home_Island_Map.png', 'Home_Island.png', 'Marina_map_(annotated).png', 'Marina_Map.png', 'Marina.jpg'] },
  { id: 'paradise-island', name: 'Paradise Island', cloverSlug: 'paradise', fandomPage: 'Paradise_Island', fandomFiles: ['Paradise_Island_map_(annotated).png', 'Paradise_Island_Map.png'] },
  { id: 'great-lakes', name: 'Great Lakes', cloverSlug: 'great-lakes', fandomPage: 'Great_Lakes', fandomFiles: ['Great_Lakes_map_(annotated).png', 'Great_Lakes_Map.png'] },
  { id: 'costa-rica', name: 'Costa Rica', cloverSlug: 'costa-rica', fandomPage: 'Costa_Rica', fandomFiles: ['Costa_Rica_map_(annotated).png', 'Costa_Rica_Map.png'] },
  { id: 'alaska', name: 'Alaska', cloverSlug: 'alaska', fandomPage: 'Alaska', fandomFiles: ['Alaska_map_(annotated).png', 'Alaska_Map.png'] },
  { id: 'australia', name: 'Australia', cloverSlug: 'australia', fandomPage: 'Australia', fandomFiles: ['Australia_map_(annotated).png', 'Australia_map.jpg'] },
  { id: 'scotland', name: 'Scotland', cloverSlug: 'scotland', fandomPage: 'Scotland', fandomFiles: ['Scotland_map_(annotated).png', 'Scotland_map_(by_Data).png'] },
  { id: 'thailand', name: 'Thailand', cloverSlug: 'thailand', fandomPage: 'Thailand', fandomFiles: ['Thailand_map_(annotated).png', 'Thailand_map.png'] },
  { id: 'amazon', name: 'Amazon', cloverSlug: 'amazon', fandomPage: 'Amazon', fandomFiles: ['Amazon_map_(annotated).png', 'Amazon_map.png'] },
  { id: 'chemical-plant', name: 'Chemical Plant', cloverSlug: 'chemical-plant', fandomPage: 'Chemical_Plant', fandomFiles: ['Chemical_plant_map_(by_data).jpg', 'Chemical_Plant.png'] },
  { id: 'nuclear-plant', name: 'Nuclear Plant', cloverSlug: 'nuclear-plant', fandomPage: 'Nuclear_Plant', fandomFiles: ['NuclearPlantMap.png', 'NuclearPlant.png'] },
  { id: 'petrochemical-zone', name: 'Petrochemical Zone', cloverSlug: null, fandomPage: 'Petrochemical_Zone', fandomFiles: ['Petrochemical_Map.jpg', 'Petrochemical.png'] },
  { id: 'bermuda-triangle', name: 'Bermuda Triangle', cloverSlug: 'bermuda-triangle', fandomPage: 'Bermuda_Triangle', fandomFiles: ['Bermuda_Triangle.jpg'] }
];

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} ${url}`);
  return res.text();
}

async function fetchJson(url) {
  const text = await fetchText(url);
  return JSON.parse(text);
}

function extractMapDataJson(html) {
  const m = html.match(/<script type=application\/json id=map-data-json>(.*?)<\/script>/s);
  if (!m) throw new Error('map-data-json not found');
  return JSON.parse(m[1]);
}

async function resolveFandomImageUrl(fileName) {
  const title = encodeURIComponent(`File:${fileName}`);
  const api = `https://creatures-of-the-deep-app.fandom.com/api.php?action=query&titles=${title}&prop=imageinfo&iiprop=url&format=json`;
  const data = await fetchJson(api);
  const pages = data?.query?.pages || {};
  for (const page of Object.values(pages)) {
    const url = page?.imageinfo?.[0]?.url;
    if (url) return url;
  }
  return null;
}

function normalizeEntity(e) {
  return {
    id: e.id,
    name: e.names?.en || e.name,
    rarity: e.rarity || e.rawType || 'unknown',
    rawType: e.rawType || null,
    positions: Array.isArray(e.positions) ? e.positions : [],
    snippet: e.snippet || '',
    day: e.day ?? null,
    night: e.night ?? null
  };
}

async function main() {
  for (const map of MAPS) {
    const mapDir = path.join('assets', 'maps', map.id);
    const dataDir = path.join('assets', 'data', map.id);
    await fs.mkdir(mapDir, { recursive: true });
    await fs.mkdir(dataDir, { recursive: true });

    let downloaded = false;
    for (const fileName of map.fandomFiles) {
      const imageUrl = await resolveFandomImageUrl(fileName);
      if (!imageUrl) continue;
      const res = await fetch(imageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      await fs.writeFile(path.join(mapDir, 'background.jpg'), buf);
      downloaded = true;
      break;
    }
    if (!downloaded) {
      console.warn(`[warn] map image not downloaded: ${map.id}`);
    }

    if (map.cloverSlug) {
      const html = await fetchText(`https://cloversalad.com/maps/${map.cloverSlug}/fish/`);
      const json = extractMapDataJson(html);
      await fs.writeFile(path.join(dataDir, 'raw.json'), JSON.stringify(json, null, 2));

      const fish = (json.fish || []).map(normalizeEntity);
      const creatures = (json.creatures || []).map(normalizeEntity);
      const items = (json.objects || []).map(normalizeEntity);

      await fs.writeFile(path.join(dataDir, 'fish.json'), JSON.stringify(fish, null, 2));
      await fs.writeFile(path.join(dataDir, 'creatures.json'), JSON.stringify(creatures, null, 2));
      await fs.writeFile(path.join(dataDir, 'items.json'), JSON.stringify(items, null, 2));
    } else {
      await fs.writeFile(path.join(dataDir, 'raw.json'), JSON.stringify({ note: 'No cloversalad dataset page found yet for this map.' }, null, 2));
      await fs.writeFile(path.join(dataDir, 'fish.json'), '[]\n');
      await fs.writeFile(path.join(dataDir, 'creatures.json'), '[]\n');
      await fs.writeFile(path.join(dataDir, 'items.json'), '[]\n');
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
