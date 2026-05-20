import fs from 'node:fs/promises';
import path from 'node:path';

const MAPS = [
  { id: 'marina', name: 'Marina', mapPage: 'Map:Home Island', cloverSlug: 'marina' },
  { id: 'paradise-island', name: 'Paradise Island', mapPage: 'Map:Paradise Island', cloverSlug: 'paradise' },
  { id: 'great-lakes', name: 'Great Lakes', mapPage: 'Map:Great Lakes', cloverSlug: 'great-lakes' },
  { id: 'costa-rica', name: 'Costa Rica', mapPage: 'Map:Costa Rica', cloverSlug: 'costa-rica' },
  { id: 'alaska', name: 'Alaska', mapPage: 'Map:Alaska', cloverSlug: 'alaska' },
  { id: 'australia', name: 'Australia', mapPage: 'Map:Australia', cloverSlug: 'australia' },
  { id: 'scotland', name: 'Scotland', mapPage: 'Map:Scotland', cloverSlug: 'scotland' },
  { id: 'thailand', name: 'Thailand', mapPage: 'Map:Thailand', cloverSlug: 'thailand' },
  { id: 'amazon', name: 'Amazon', mapPage: 'Map:Amazon', cloverSlug: 'amazon' },
  { id: 'chemical-plant', name: 'Chemical Plant', mapPage: 'Map:Chemical Plant', cloverSlug: 'chemical-plant' },
  { id: 'nuclear-plant', name: 'Nuclear Plant', mapPage: 'Map:Nuclear Plant', cloverSlug: 'nuclear-plant' },
  { id: 'petrochemical-zone', name: 'Petrochemical Zone', mapPage: 'Map:Petrochemical Zone', cloverSlug: null },
  { id: 'bermuda-triangle', name: 'Bermuda Triangle', mapPage: 'Map:Bermuda Triangle', cloverSlug: 'bermuda-triangle' }
];

const rarityMap = {
  common: 'common',
  uncommon: 'common',
  rare: 'rare',
  epic: 'epic',
  legendary: 'epic',
  mythic: 'epic',
  monster: 'epic',
  item: 'common'
};

const toVarName = (id) => id.replace(/-([a-z])/g, (_, c) => c.toUpperCase()) + 'Map';
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function toKoreanDisplay(name) {
  const n = String(name || '').trim();
  if (!n) return '';
  const exact = {
    bluefish: '블루피시',
    clownfish: '클라운피시',
    bonefish: '본피시',
    'longtail tuna': '롱테일 참치',
    'white tuna': '화이트 참치',
    shredder: '슈레더',
    anchovy: '멸치',
    sardine: '정어리',
    brisling: '브리슬링',
    blobfish: '블롭피시',
    mudskipper: '망둥어'
  };
  const hit = exact[n.toLowerCase()];
  if (hit) return hit;
  return n
    .replace(/shark/gi, '샤크')
    .replace(/fish/gi, '피시')
    .replace(/tuna/gi, '참치')
    .replace(/crab/gi, '크랩')
    .replace(/shrimp/gi, '새우')
    .replace(/ray/gi, '레이')
    .replace(/eel/gi, '장어')
    .replace(/octopus/gi, '문어')
    .replace(/starfish/gi, '불가사리')
    .replace(/shell/gi, '조개껍데기')
    .replace(/bottle/gi, '병')
    .replace(/chest/gi, '상자')
    .replace(/key/gi, '열쇠');
}

async function fetchJson(url) {
  const ctl = AbortSignal.timeout(15000);
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: ctl });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function fetchText(url) {
  const ctl = AbortSignal.timeout(15000);
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: ctl });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

function parseCloverMapData(html) {
  const m = html.match(/<script type=application\/json id=map-data-json>(.*?)<\/script>/s);
  if (!m) return null;
  return JSON.parse(m[1]);
}

function readAttr(attributes, key) {
  if (!Array.isArray(attributes)) return [];
  const found = attributes.find((a) => Object.prototype.hasOwnProperty.call(a, key));
  if (!found) return [];
  const v = found[key];
  return Array.isArray(v) ? v : [];
}

function readSingleAttr(attributes, key) {
  if (!Array.isArray(attributes)) return null;
  const found = attributes.find((a) => Object.prototype.hasOwnProperty.call(a, key));
  if (!found) return null;
  return found[key];
}

function toTimeBand(entity) {
  if (entity?.day === true && entity?.night === false) return 'day';
  if (entity?.day === false && entity?.night === true) return 'night';
  const moment = readAttr(entity?.attributes, 'moment');
  if (moment.length === 1 && moment[0] === 0) return 'day';
  if (moment.length === 1 && moment[0] === 1) return 'night';
  return 'both';
}

function categoryFromId(id) {
  const low = String(id || '').toLowerCase();
  if (low.startsWith('t') || low.includes('item')) return 'item';
  if (low.startsWith('c-') || low.startsWith('c0') || low.startsWith('c1') || low.startsWith('c2') || low.startsWith('c3') || low.startsWith('c4') || low.startsWith('c5') || low.startsWith('c6')) return 'creature';
  return 'fish';
}

function imageUrlForEntity(entity, category) {
  const id = entity?.id || '';
  if (category === 'item') return `https://cloversalad.com/trashPortraits/${id}.png`;
  if (category === 'creature') return `https://cloversalad.com/creaturesPortraits/${id}.png`;
  return `https://cloversalad.com/fishPortraits/${id}.png`;
}

async function downloadIfMissing(url, filePath) {
  try {
    await fs.access(filePath);
    return;
  } catch {}
  try {
    const ctl = AbortSignal.timeout(8000);
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: ctl });
    if (!res.ok) return;
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buf);
  } catch {}
}

function normalizeFileTitle(fileLike) {
  if (!fileLike) return null;
  return String(fileLike).replace(/^File:/i, '').trim();
}

async function resolveFandomFileUrl(fileTitle) {
  if (!fileTitle) return null;
  const api = `https://creatures-of-the-deep-app.fandom.com/api.php?action=query&titles=${encodeURIComponent(`File:${fileTitle}`)}&prop=imageinfo&iiprop=url&format=json`;
  try {
    const data = await fetchJson(api);
    const pages = data?.query?.pages || {};
    for (const page of Object.values(pages)) {
      const u = page?.imageinfo?.[0]?.url;
      if (u) return u;
    }
  } catch {}
  return null;
}
const fileUrlCache = new Map();

function locationsFromMarkers(markers, size) {
  return markers.map((mk, idx) => {
    const x = Number(mk.position?.[0]);
    const y = Number(mk.position?.[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return {
      no: idx + 1,
      x,
      y,
      lat: Math.round(y),
      lng: Math.round(x)
    };
  }).filter(Boolean);
}

for (const map of MAPS) {
  const mapApi = `https://creatures-of-the-deep-app.fandom.com/api.php?action=parse&page=${encodeURIComponent(map.mapPage)}&prop=wikitext&format=json`;
  const mapRes = await fetchJson(mapApi);
  if (mapRes.error) throw new Error(`Missing map page: ${map.mapPage}`);
  const mapJson = JSON.parse(mapRes.parse.wikitext['*']);

  const size = {
    width: Number(mapJson.mapBounds?.[1]?.[0] || 1000),
    height: Number(mapJson.mapBounds?.[1]?.[1] || 1000)
  };

  const categories = Array.isArray(mapJson.categories) ? mapJson.categories : [];
  const markers = Array.isArray(mapJson.markers) ? mapJson.markers : [];

  const categoryById = Object.fromEntries(categories.map((c) => [c.id, c]));
  const markersByCategory = new Map();
  for (const mk of markers) {
    if (!mk?.categoryId || mk.categoryId === 'settings') continue;
    if (!markersByCategory.has(mk.categoryId)) markersByCategory.set(mk.categoryId, []);
    markersByCategory.get(mk.categoryId).push(mk);
  }

  let clover = { fish: [], creatures: [], objects: [], monster: null };
  if (map.cloverSlug) {
    const html = await fetchText(`https://cloversalad.com/maps/${map.cloverSlug}/fish/`);
    const parsed = parseCloverMapData(html);
    if (parsed) clover = parsed;
  }

  const entitiesRaw = [
    ...(Array.isArray(clover.fish) ? clover.fish : []),
    ...(Array.isArray(clover.creatures) ? clover.creatures : []),
    ...(Array.isArray(clover.objects) ? clover.objects : []),
    ...(clover.monster ? [clover.monster] : [])
  ];

  const mapNameToCategoryId = new Map();
  for (const c of categories) {
    mapNameToCategoryId.set(norm(c.name), c.id);
  }

  const entities = [];
  for (const entity of entitiesRaw) {
    const category = entity === clover.monster ? 'fish' : categoryFromId(entity.id);
    const n1 = norm(entity?.names?.en || entity?.name);
    const n2 = norm(entity?.name);
    const cid = mapNameToCategoryId.get(n1) || mapNameToCategoryId.get(n2) || null;
    const cat = cid ? categoryById[cid] : null;
    const catMarkers = cid ? (markersByCategory.get(cid) || []) : [];
    const locations = locationsFromMarkers(catMarkers, size);

    const raw = String(entity?.rarity || entity?.rawType || (entity === clover.monster ? 'monster' : 'common')).toLowerCase();
    const rarity = rarityMap[raw] || 'rare';

    const imageUrl = imageUrlForEntity(entity, category);
    const localImage = `./assets/portraits/${category}/${entity.id}.png`;
    await downloadIfMissing(imageUrl, `assets/portraits/${category}/${entity.id}.png`);

    let localAltImage = '';
    const fileTitle = normalizeFileTitle(cat?.icon);
    if (fileTitle) {
      const ext = (fileTitle.split('.').pop() || 'png').toLowerCase();
      const altPath = `assets/portraits-mapicons/${map.id}/${entity.id}.${ext}`;
      let altUrl = fileUrlCache.get(fileTitle) || null;
      if (!altUrl) {
        altUrl = await resolveFandomFileUrl(fileTitle);
        if (altUrl) fileUrlCache.set(fileTitle, altUrl);
      }
      if (altUrl) await downloadIfMissing(altUrl, altPath);
      try { await fs.access(altPath); localAltImage = `./${altPath}`; } catch {}
    }

    entities.push({
      id: entity.id,
      name: entity?.names?.en || entity?.name || 'unknown',
      display: toKoreanDisplay(entity?.names?.en || entity?.name || ''),
      category,
      rarity,
      isMonster: entity === clover.monster,
      timeBand: toTimeBand(entity),
      locations,
      notes: entity?.snippet || '',
      latin: entity?.latin || '',
      difficulty: entity?.difficulty ?? null,
      seasons: Array.isArray(entity?.seasons) ? entity.seasons : [],
      minigame:
        entity?.minigameType ||
        entity?.minigame ||
        readSingleAttr(entity?.attributes, 'minigame') ||
        readSingleAttr(entity?.attributes, 'miniGame') ||
        null,
      image: localImage,
      altImage: localAltImage,
      shadowSizes: readAttr(entity?.attributes, 'shadow'),
      shadowSpeeds: readAttr(entity?.attributes, 'speed'),
      mapCategory: cat?.name || ''
    });
  }

  const fileContent = `export const ${toVarName(map.id)} = ${JSON.stringify({
    id: map.id,
    name: map.name,
    imagePath: `./assets/maps/${map.id}/background.jpg`,
    imageWidth: size.width,
    imageHeight: size.height,
    entities
  }, null, 2)};\n`;

  await fs.writeFile(`data/maps/${map.id}.js`, fileContent);
}

const imports = MAPS.map((m) => `import { ${toVarName(m.id)} } from "./${m.id}.js";`).join('\n');
const list = MAPS.map((m) => `  ${toVarName(m.id)}`).join(',\n');
const idx = `${imports}\n\nconst maps = [\n${list}\n];\n\nexport const mapOrder = maps.map((map) => map.id);\nexport const mapsById = Object.fromEntries(maps.map((map) => [map.id, map]));\n`;
await fs.writeFile('data/maps/index.js', idx);
