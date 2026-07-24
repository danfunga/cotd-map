import {createEmptyCategorizedEntityMap, state} from "./state.js";
import {FILTER_DEFAULTS} from "../constants/filterDefaults.js";
import {mapOrder} from '../../content/mapIndex.js';

const STORAGE_KEY = "cotd-map:user-state:v1";

const PersistedState = {
    save,
    load,
    // apply,
    export: exportState,
    import: importState
};

export default PersistedState;

function write(payload) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function read() {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
}

function save() {
    const payload = buildPayload();
    write(payload);
    return payload;
}

function load() {
    try {
        const data = read();
        if (!data) return;
        validateData(data);
        apply(data);
    } catch (error) {
        console.warn("Failed to restore persisted state", error);
    }
}

async function exportState() {
    const payload = save();
    const json = JSON.stringify(payload, null, 2);
    try {
        await navigator.clipboard.writeText(json);
        alert("설정 JSON이 클립보드에 복사되었습니다.");
    } catch (e) {
        prompt("아래 JSON을 복사하세요.", json);
    }
}

function importState(jsonText) {
    const data = JSON.parse(jsonText);
    validateData(data);
    apply(data);
    save();
}

function validateData(data) {
    if (!isPlainObject(data)) {
        throw new Error("가져올 수 없는 파일입니다.");
    }
}

function apply(data) {
    clearUserStateMemory();

    applyState(data);
    applyFilters(data);
    applyCaughtFilterMode(data);
    applyCaughtEntities(data);
    applyActiveEntities(data);
}

function applyState(data) {
    state.currentMapId = mapOrder.includes(data.mapId) ? data.mapId : mapOrder[0];

    state.isTipsMode = Boolean(data.isTipsMode);
    state.isMapFullscreen = Boolean(data.isMapFullscreen);
    state.monsterRotationRevealed = Boolean(data.monsterRotationRevealed);
    state.alwaysShowBoss = Boolean(data.alwaysShowBoss);
    state.realtimeTimeFilterEnabled = Boolean(data.realtimeTimeFilterEnabled);
}

function applyFilters(data) {
    for (const group of ["category", "time", "rarity", "availability"]) {
        const values =
            data.filters && Array.isArray(data.filters[group])
                ? data.filters[group]
                : [...FILTER_DEFAULTS[group]];

        state.filters[group] = new Set(values);
    }
}

function applyCaughtFilterMode(data) {
    for (const category of ["fish", "creature", "item"]) {
        const mode = data.caughtFilterMode?.[category];

        state.caughtFilterMode[category] =
            mode === "all" ||
            mode === "caught" ||
            mode === "uncaught"
                ? mode
                : "all";
    }
}

function applyCaughtEntities(data) {
    loadEntityKeysByMap(
        data.caughtEntitiesByMap,
        addCaughtEntityKey
    );
}

function applyActiveEntities(data) {
    loadEntityKeysByMap(
        data.activeEntitiesByMap,
        addActiveEntityKey,
        (mapId) => state.selection.initializedActiveMapIds.add(mapId)
    );
}

function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function loadEntityKeysByMap(value, addKey, markMap = null) {
    if (!isPlainObject(value)) return false;
    Object.entries(value).forEach(([mapId, categoryMap]) => {
        if (!mapOrder.includes(mapId) || !isPlainObject(categoryMap)) return;
        Object.entries(categoryMap).forEach(([category, ids]) => {
            if (!Array.isArray(ids)) return;
            ids.forEach((id) => {
                if (typeof id === "string") addKey(mapId, category, id);
            });
        });
        if (markMap) markMap(mapId);
    });
    return true;
}

function clearUserStateMemory() {
    state.selection.activeEntityKeys.clear();
    state.selection.initializedActiveMapIds.clear();
    state.selection.caughtEntityKeys.clear();
}

function addActiveEntityKey(mapId, category, id) {
    state.selection.activeEntityKeys.add(`${mapId}:${category}:${id}`);
}

function addCaughtEntityKey(mapId, category, id) {
    state.selection.caughtEntityKeys.add(`${mapId}:${category}:${id}`);
}

function buildPayload() {
    return {
        version: 2,
        mapId: state.currentMapId,
        isTipsMode: state.isTipsMode,
        isMapFullscreen: state.isMapFullscreen,
        monsterRotationRevealed: state.monsterRotationRevealed,
        alwaysShowBoss: state.alwaysShowBoss,
        realtimeTimeFilterEnabled: state.realtimeTimeFilterEnabled,

        filters: {
            category: [...state.filters.category],
            time: [...state.filters.time],
            rarity: [...state.filters.rarity],
            availability: [...state.filters.availability]
        },

        caughtEntitiesByMap: serializeCaughtEntitiesByMap(),
        caughtFilterMode: {...state.caughtFilterMode},
        activeEntitiesByMap: serializeActiveEntitiesByMap()
    };
}

function serializeActiveEntitiesByMap() {
    return serializeEntityKeysByMap(state.selection.activeEntityKeys, state.selection.initializedActiveMapIds);
}

function serializeCaughtEntitiesByMap() {
    return serializeEntityKeysByMap(state.selection.caughtEntityKeys);
}

function serializeEntityKeysByMap(entityKeys, mapIds = new Set()) {
    const byMap = {};
    mapIds.forEach((mapId) => {
        byMap[mapId] = createEmptyCategorizedEntityMap();
    });
    entityKeys.forEach((key) => {
        const [mapId, category, id] = key.split(":");
        if (!mapId || !category || !id) return;
        if (!byMap[mapId]) byMap[mapId] = createEmptyCategorizedEntityMap();
        if (!Array.isArray(byMap[mapId][category])) byMap[mapId][category] = [];
        byMap[mapId][category].push(id);
    });
    return byMap;
}