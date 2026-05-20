import { marinaMap } from "./marina.js";
import { paradiseIslandMap } from "./paradise-island.js";
import { greatLakesMap } from "./great-lakes.js";
import { costaRicaMap } from "./costa-rica.js";
import { alaskaMap } from "./alaska.js";
import { australiaMap } from "./australia.js";
import { scotlandMap } from "./scotland.js";
import { thailandMap } from "./thailand.js";
import { amazonMap } from "./amazon.js";
import { chemicalPlantMap } from "./chemical-plant.js";
import { nuclearPlantMap } from "./nuclear-plant.js";
import { petrochemicalZoneMap } from "./petrochemical-zone.js";
import { bermudaTriangleMap } from "./bermuda-triangle.js";

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
  petrochemicalZoneMap,
  bermudaTriangleMap
];

export const mapOrder = maps.map((map) => map.id);
export const mapsById = Object.fromEntries(maps.map((map) => [map.id, map]));
