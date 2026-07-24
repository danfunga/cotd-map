import {FILTER_DEFAULTS} from "../constants/filterDefaults.js";

export const createEmptyCategorizedEntityMap = () => ({
    fish: [],
    creature: [],
    item: [],
    monster: []
});

export const state = {
    currentMapId: null,
    isTipsMode: false,
    isMapFullscreen: false,
    currentDetailEntity: null,

    alwaysShowBoss: false,
    monsterRotationRevealed: false,
    realtimeTimeFilterEnabled: false,

    mapInstance: null,
    markerLayer: null,

    renderRequestId: 0,
    renderScheduled: false,
    scheduledRefreshPanel: false,
    resetActiveOnNextRender: false,
    lastFilteredEntities: [],

    cache: {
        mapEntities: new Map(),
        markerBundle: new Map(),
        entityRow: new Map(),
        groupUi: new Map()
    },
    caughtFilterMode: {
        fish: "all",
        creature: "all",
        item: "all"
    },
    panelFoldState: {
        fish: true,
        creature: true,
        item: true
    },

    selection: {
        activeEntityKeys: new Set(),
        caughtEntityKeys: new Set(),
        activeMarkerKeys: new Set(),
        initializedActiveMapIds: new Set()
    },

    filters: {
        category: new Set(FILTER_DEFAULTS.category),
        time: new Set(FILTER_DEFAULTS.time),
        rarity: new Set(FILTER_DEFAULTS.rarity),
        availability: new Set(FILTER_DEFAULTS.availability)
    },

    filterDefaults: {
        category: new Set(["fish", "creature", "item", "monster"]),
        time: new Set(["day", "night", "both"]),
        rarity: new Set(["common", "rare", "epic", "monster"]),
        availability: new Set(["available", "unavailable"])
    }

};