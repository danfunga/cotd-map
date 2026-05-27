import { marinaMap } from "./maps/marina.js";
import { paradiseIslandMap } from "./maps/paradise-island.js";
import { greatLakesMap } from "./maps/great-lakes.js";
import { costaRicaMap } from "./maps/costa-rica.js";
import { alaskaMap } from "./maps/alaska.js";
import { australiaMap } from "./maps/australia.js";
import { scotlandMap } from "./maps/scotland.js";
import { thailandMap } from "./maps/thailand.js";
import { amazonMap } from "./maps/amazon.js";
import { chemicalPlantMap } from "./maps/chemical-plant.js";
import { nuclearPlantMap } from "./maps/nuclear-plant.js";
import { petrochemicalMap } from "./maps/petrochemical.js";
import { bermudaTriangleMap } from "./maps/bermuda-triangle.js";
import { displayOverrides } from "./display-overrides.js";

function applyDisplayOverrides(map) {
  const overrideByMap = displayOverrides[map.id] || {};
  const entities = (map.entities || []).map((entity) => {
    const byName = overrideByMap[entity.name];
    const display = byName || entity.display || entity.name;
    return { ...entity, display };
  });
  return { ...map, entities };
}

const maps = [
  marinaMap,
  paradiseIslandMap,
  greatLakesMap,
  costaRicaMap,
  alaskaMap,
  australiaMap,
  scotlandMap,
  thailandMap,
  amazonMap,
  chemicalPlantMap,
  nuclearPlantMap,
  petrochemicalMap,
  bermudaTriangleMap
].map(applyDisplayOverrides);

export const mapOrder = maps.map((map) => map.id);
export const mapsById = Object.fromEntries(maps.map((map) => [map.id, map]));
