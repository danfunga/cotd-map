import {createEmptyCategorizedEntityMap, state} from "../state/state.js";
import {mapsById} from "../../content/mapIndex.js";

class EntityManager {
    constructor() {
    }

    setDependencies(deps) {
        this.deps = deps;
    }

    init() {
    }

    getGroupCaughtMode(category) {
        return state.caughtFilterMode[category] || "all";
    }

    currentMapKeyPrefix(mapId = state.currentMapId) {
        return `${mapId}:`;
    }

    entityKey(entity, mapId = state.currentMapId) {
        return `${mapId}:${entity.category}:${entity.id}`;
    }

    isEntityActive(entity, mapId = state.currentMapId) {
        if (!state.selection.initializedActiveMapIds.has(mapId)) return true;
        if (entity.category === "monster" && state.alwaysShowBoss) return true;
        return state.selection.activeEntityKeys.has(this.entityKey(entity, mapId));
    }

    isCaught(entity, mapId = state.currentMapId) {
        return state.selection.caughtEntityKeys.has(this.entityKey(entity, mapId));
    }

    async loadMapEntities(mapId) {
        if (state.cache.mapEntities.has(mapId)) return state.cache.mapEntities.get(mapId);
        const basePath = mapsById[mapId]?.dataPath || `./assets/maps/${mapId}`;
        const targets = ["1_fish", "2_creatures", "3_items"];
        const responses = await Promise.all(
            targets.map(async (name) => {
                try {
                    const res = await fetch(`${basePath}/${name}.json`);
                    if (!res.ok) return [];
                    const data = await res.json();
                    return Array.isArray(data) ? data : [];
                } catch {
                    return [];
                }
            })
        );
        const all = responses.flat();
        const cache = {
            all,
            byCategory: createEmptyCategorizedEntityMap()
        };
        for (const entity of all) {
            cache.byCategory[entity.category].push(entity);
        }
        state.cache.mapEntities.set(mapId, cache);
        return cache;
    }

    label(entity) {
        return entity.display && entity.display.trim() !== "" ? entity.display : entity.name;
    }

    resetActiveEntitiesForMap(entities, mapId = state.currentMapId) {
        const prefix = this.currentMapKeyPrefix(mapId);
        state.selection.activeEntityKeys.forEach((key) => {
            if (key.startsWith(prefix)) state.selection.activeEntityKeys.delete(key);
        });
        entities.forEach((entity) => state.selection.activeEntityKeys.add(this.entityKey(entity, mapId)));
        state.selection.initializedActiveMapIds.add(mapId);
    }

    passesCurrentFilters(entity) {
        if (entity.category === "monster") {
            return state.alwaysShowBoss;
        }
        if (!state.filters.category.has(entity.category)) return false;
        if (!state.filters.rarity.has(entity.rarity)) return false;
        if (!this.hitFishTimeFilter(entity)) return false;
        const availableNow = this.isSeasonAvailable(entity);
        const availabilityKey = availableNow ? "available" : "unavailable";
        if (!state.filters.availability.has(availabilityKey)) return false;
        const mode = this.getGroupCaughtMode(entity.category);
        if (mode === "caught" && !this.isCaught(entity)) return false;
        return !(mode === "uncaught" && this.isCaught(entity));
    }

    toggleCaught(entity) {
        const key = this.entityKey(entity);
        if (state.selection.caughtEntityKeys.has(key)) {
            state.selection.caughtEntityKeys.delete(key);
        } else {
            state.selection.caughtEntityKeys.add(key);
        }
        this.deps.saveAndRender(true);
    }

    isSeasonAvailable(entity) {
        if (!Array.isArray(entity.seasons) || entity.seasons.length !== 12) return true;
        return Boolean(entity.seasons[new Date().getMonth()]);
    }

    hitFishTimeFilter(entity) {
        if (entity.timeBand === "day") return state.filters.time.has("day");
        if (entity.timeBand === "night") return state.filters.time.has("night");
        if (entity.timeBand === "both") return state.filters.time.has("both");
        return false;
    }
}

const entityManager = new EntityManager();
export default entityManager;