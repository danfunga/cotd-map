import {mapOrder, mapsById} from './content/index.js';

const mapPicker = document.getElementById("mapPicker");
const filterButtons = document.querySelectorAll(".filter-btn[data-group]");
const clearButtons = document.querySelectorAll(".clear-btn[data-clear-group]");
const entityList = document.getElementById("entityList");
const uncaughtOnlyBtn = document.getElementById("uncaughtOnlyBtn");
const showAllBtn = document.getElementById("showAllBtn");
const hideAllBtn = document.getElementById("hideAllBtn");
const caughtFilterAllBtn = document.getElementById("caughtFilterAllBtn");
const exportStateBtn = document.getElementById("exportStateBtn");
const importStateBtn = document.getElementById("importStateBtn");
const importedStateDialog = document.getElementById("importStateDialog");
const importedTextContents = document.getElementById("importStateText");

const alwaysShowBossBtn = document.getElementById("alwaysShowBossBtn");
const todaySpotToggleBtn = document.getElementById("todaySpotToggleBtn");
const realtimeTimeToggleBtn = document.getElementById("realtimeTimeToggleBtn");

const panelToggleBtn = document.getElementById("panelToggleBtn");
const fullscreenToggleBtn = document.getElementById("fullscreenToggleBtn");
const detailSheet = document.getElementById("detailSheet");
const detailBody = document.getElementById("detailBody");
const detailClose = document.getElementById("detailClose");
const detailBackdrop = document.getElementById("detailBackdrop");
const controlsSection = document.getElementById("controls");
const mapLayout = document.getElementById("mapLayout");
const tipsLayout = document.getElementById("tipsLayout");
const controlsHome = {
    parent: controlsSection.parentElement,
    nextSibling: controlsSection.nextSibling
};
const STORAGE_KEY = "cotd-map:user-state:v1";
const TIPS_PAGE_ID = "__tips__";

const defaults = {
    category: new Set(["fish", "creature", "item", "monster"]),
    time: new Set(["day", "night", "both"]),
    rarity: new Set(["common", "rare", "epic", "monster"]),
    availability: new Set(["available", "unavailable"])
};

const filters = {
    category: new Set(defaults.category),
    time: new Set(defaults.time),
    rarity: new Set(defaults.rarity),
    availability: new Set(defaults.availability)
};

let currentMapId = mapOrder[0];
let isTipsMode = false;
let isMapFullscreen = false;
let mapInstance = null;
let markerLayer = null;
let lastFilteredEntities = [];
const mapEntitiesCache = new Map();
const markerBundleCache = new Map();
const activeMarkerKeys = new Set();
const entityRowCache = new Map();
const groupUiCache = new Map();
let renderRequestId = 0;
let renderScheduled = false;
let scheduledRefreshPanel = false;
let resetActiveOnNextRender = false;
let currentDetailEntity = null;
const activeEntityKeys = new Set();
const initializedActiveMapIds = new Set();
const caughtEntityKeys = new Set();
const panelFoldState = {
    fish: true,
    creature: true,
    item: true
};
const caughtFilterMode = {
    fish: "all",
    creature: "all",
    item: "all"
};
const MONSTER_ROTATION_MAP_IDS = new Set([
    "02_paradise-island",
    "03_great-lakes",
    "04_costa-rica",
    "05_alaska",
    "06_australia",
    "07_scotland",
    "08_thailand",
    "09_amazon"
]);
const MONSTER_ROTATION_CONFIG = {
    "02_paradise-island": {
        startDate: "2024-05-01",
        rotation: [1, 3, 2, 2, 3, 1, 2, 3, 3, 2, 1, 3, 2, 3, 2, 3, 3, 2, 2, 2, 2, 2, 1, 1, 3, 3]
    },
    "03_great-lakes": {
        startDate: "2024-05-01",
        rotation: [1, 4, 3, 3, 2, 4, 1, 4, 2, 4, 1, 2, 1, 3, 3, 2, 2, 3, 3, 1, 3, 3, 4, 3, 1, 3]
    },
    "04_costa-rica": {
        startDate: "2024-05-01",
        rotation: [3, 1, 2, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 2, 1, 1, 2, 2, 2, 2, 2, 3, 3, 1, 1]
    },
    "05_alaska": {
        startDate: "2024-05-01",
        rotation: [3, 4, 1, 1, 2, 4, 3, 4, 2, 4, 3, 2, 3, 1, 1, 2, 2, 1, 1, 3, 1, 1, 4, 1, 3, 1]
    },
    "06_australia": {
        startDate: "2024-05-01",
        rotation: [3, 4, 1, 1, 2, 4, 3, 4, 2, 4, 3, 2, 3, 1, 1, 2, 2, 1, 1, 3, 1, 1, 4, 1, 3, 1]
    },
    "07_scotland": {
        startDate: "2024-05-01",
        rotation: [1, 5, 2, 2, 5, 6, 2, 5, 5, 4, 1, 5, 2, 3, 2, 5, 5, 2, 2, 2, 2, 2, 6, 1, 3, 3]
    },
    "08_thailand": {
        startDate: "2026-04-03",
        rotation: [3, 2, 1, 1, 4, 2, 3, 2, 4, 2, 3, 4, 3, 1, 1, 4, 4, 1, 1, 3, 1, 1, 2, 1, 3, 1]
    },
    "09_amazon": {
        startDate: "2024-05-01",
        rotation: [3, 4, 1, 1, 2, 4, 3, 4, 2, 4, 3, 2, 3, 1, 1, 2, 2, 1, 1, 3, 1, 1, 4, 1, 3, 1]
    }
};
// Toolbar
let alwaysShowBoss = false;
let monsterRotationRevealed = false;
let realtimeTimeFilterEnabled = false;

function nextCaughtMode(mode) {
    if (mode === "all") return "uncaught";
    if (mode === "uncaught") return "all";
    return "all";
}

function caughtModeLabel(mode) {
    if (mode === "caught") return "잡음";
    if (mode === "uncaught") return "미획득";
    return "전체";
}

function getGroupCaughtMode(category) {
    return caughtFilterMode[category] || "all";
}

function syncCaughtFilterAllButton() {
    if (!caughtFilterAllBtn) return;
    const modes = [caughtFilterMode.fish, caughtFilterMode.creature, caughtFilterMode.item];
    const same = modes.every((mode) => mode === modes[0]);
    caughtFilterAllBtn.textContent = same ? caughtModeLabel(modes[0]) : "혼합";
}

function entityKey(entity, mapId = currentMapId) {
    return `${mapId}:${entity.category}:${entity.id}`;
}

function currentMapKeyPrefix(mapId = currentMapId) {
    return `${mapId}:`;
}

function addActiveEntityKey(mapId, category, id) {
    activeEntityKeys.add(`${mapId}:${category}:${id}`);
}

function addCaughtEntityKey(mapId, category, id) {
    caughtEntityKeys.add(`${mapId}:${category}:${id}`);
}

function emptyCategorizedEntityMap() {
    return {fish: [], creature: [], item: [], monster: []};
}

function serializeEntityKeysByMap(entityKeys, mapIds = new Set()) {
    const byMap = {};
    mapIds.forEach((mapId) => {
        byMap[mapId] = emptyCategorizedEntityMap();
    });
    entityKeys.forEach((key) => {
        const [mapId, category, id] = key.split(":");
        if (!mapId || !category || !id) return;
        if (!byMap[mapId]) byMap[mapId] = emptyCategorizedEntityMap();
        if (!Array.isArray(byMap[mapId][category])) byMap[mapId][category] = [];
        byMap[mapId][category].push(id);
    });
    return byMap;
}

function serializeActiveEntitiesByMap() {
    return serializeEntityKeysByMap(activeEntityKeys, initializedActiveMapIds);
}

function serializeCaughtEntitiesByMap() {
    return serializeEntityKeysByMap(caughtEntityKeys);
}

function resetActiveEntitiesForMap(entities, mapId = currentMapId) {
    const prefix = currentMapKeyPrefix(mapId);
    activeEntityKeys.forEach((key) => {
        if (key.startsWith(prefix)) activeEntityKeys.delete(key);
    });
    entities.forEach((entity) => activeEntityKeys.add(entityKey(entity, mapId)));
    initializedActiveMapIds.add(mapId);
}

function isEntityActive(entity, mapId = currentMapId) {
    if (!initializedActiveMapIds.has(mapId)) return true;
    if (entity.category === "monster" && alwaysShowBoss) return true;
    return activeEntityKeys.has(entityKey(entity, mapId));
}

function isCaught(entity, mapId = currentMapId) {
    return caughtEntityKeys.has(entityKey(entity, mapId));
}

function buildUserStatePayload() {
    return {
        version: 2,
        mapId: currentMapId,
        isTipsMode,
        isMapFullscreen,
        monsterRotationRevealed,   // 추가
        alwaysShowBoss,
        realtimeTimeFilterEnabled,
        filters: {
            category: [...filters.category],
            time: [...filters.time],
            rarity: [...filters.rarity],
            availability: [...filters.availability]
        },
        caughtEntitiesByMap: serializeCaughtEntitiesByMap(),
        caughtFilterMode: {...caughtFilterMode},
        activeEntitiesByMap: serializeActiveEntitiesByMap()
    };
}

function saveUserState() {
    const payload = buildUserStatePayload();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clearUserStateMemory() {
    activeEntityKeys.clear();
    initializedActiveMapIds.clear();
    caughtEntityKeys.clear();
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

function applyUserState(data) {
    if (!isPlainObject(data)) throw new Error("가져올 수 없는 파일입니다.");

    clearUserStateMemory();
    currentMapId = mapOrder.includes(data.mapId) ? data.mapId : mapOrder[0];
    isTipsMode = Boolean(data.isTipsMode);
    isMapFullscreen = Boolean(data.isMapFullscreen);
    monsterRotationRevealed = Boolean(data.monsterRotationRevealed);
    alwaysShowBoss = Boolean(data.alwaysShowBoss);
    realtimeTimeFilterEnabled = Boolean(data.realtimeTimeFilterEnabled);

    for (const group of ["category", "time", "rarity", "availability"]) {
        const values = data.filters && Array.isArray(data.filters[group]) ? data.filters[group] : [...defaults[group]];
        filters[group] = new Set(values);
    }

    for (const category of ["fish", "creature", "item"]) {
        const mode = data.caughtFilterMode?.[category];
        caughtFilterMode[category] = mode === "all" || mode === "caught" || mode === "uncaught" ? mode : "all";
    }

    loadEntityKeysByMap(data.caughtEntitiesByMap, addCaughtEntityKey);
    loadEntityKeysByMap(
        data.activeEntitiesByMap,
        addActiveEntityKey,
        (mapId) => initializedActiveMapIds.add(mapId)
    );
}

function loadUserState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);
        applyUserState(data);
    } catch {
        // Ignore invalid local state
    }
}

async function exportUserState() {
    saveUserState();
    const json = JSON.stringify(buildUserStatePayload(), null, 2);
    try {
        await navigator.clipboard.writeText(json);
        alert("설정 JSON이 클립보드에 복사되었습니다.");
    } catch (e) {
        prompt("아래 JSON을 복사하세요.", json);
    }
}

function showImportUserStateDialog() {
    importedTextContents.value = "";
    importedStateDialog.showModal();
}

function importUserStateFile(jsonText) {
    try {
        const data = JSON.parse(jsonText);
        applyUserState(data);
        saveUserState();
        refreshUiFromUserState();
        alert("가져오기가 완료되었습니다.");
    } catch (error) {
        alert(error instanceof Error ? error.message : "가져오기에 실패했습니다.");
    }
}

function refreshUiFromUserState() {
    closeDetail();
    applyViewMode();
    applyPickerState();
    applyFilterButtonState();
    syncCaughtFilterAllButton();
    updateAlwaysShowBossButton();
    updateTodaySpotToggleButton();
    updateRealtimeTimeToggleButton();
    activeMarkerKeys.clear();
    if (isTipsMode) {
        selectTipsPage();
    } else {
        renderMap();
    }
}

function label(entity) {
    return entity.display && entity.display.trim() !== "" ? entity.display : entity.name;
}

function isMonsterRotationMap(mapId = currentMapId) {
    return MONSTER_ROTATION_MAP_IDS.has(mapId);
}

function parseYmdLocal(ymd) {
    if (!ymd || typeof ymd !== "string") return null;
    const [y, m, d] = ymd.trim().split("-").map((v) => Number(v));
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
    return new Date(y, m - 1, d);
}

function monsterGameDayMidnightLocal() {
    const now = new Date();
    const shifted = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    return new Date(shifted.getFullYear(), shifted.getMonth(), shifted.getDate());
}

function getMonsterRotationActiveIndex(entity, mapId = currentMapId) {
    if (!entity || entity.category !== "monster" || !isMonsterRotationMap(mapId)) return null;
    const cfg = MONSTER_ROTATION_CONFIG[mapId];
    if (!cfg || !Array.isArray(cfg.rotation) || cfg.rotation.length === 0) return null;
    const locs = Array.isArray(entity.locations) ? entity.locations : [];
    if (locs.length <= 1) return null;
    const start = parseYmdLocal(cfg.startDate);
    if (!start) return null;
    const today = monsterGameDayMidnightLocal();
    const dayOffset = Math.floor((today.getTime() - start.getTime()) / 86400000);
    if (dayOffset < 0) return null;
    const raw = Number(cfg.rotation[dayOffset % cfg.rotation.length]);
    if (!Number.isFinite(raw)) return null;
    if (raw >= 1 && raw <= locs.length) return raw - 1;
    if (raw >= 0 && raw < locs.length) return Math.floor(raw);
    return null;
}

function shouldHideMarkerByRotation(entity, markerIndex, mapId = currentMapId) {
    const categoryKey = entity.category || "fish";
    const activeMonsterIndex = getMonsterRotationActiveIndex(entity, mapId);
    return categoryKey === "monster" &&
        isMonsterRotationMap(mapId) &&
        monsterRotationRevealed &&
        activeMonsterIndex !== null &&
        markerIndex !== activeMonsterIndex;
}

function markerIcon(entity, isPrimary = false, markerIndex = 0, hintByBubble = false) {
    const rarityKey = entity.rarity;
    const categoryKey = entity.category || "fish";
    const caught = isCaught(entity);
    const caughtClass = caught ? "caught" : "";
    const markerNumber = categoryKey === "monster" ? (markerIndex + 1) : null;
    const bubbleHintClass = hintByBubble ? "bubble-hint-marker" : "";
    if (categoryKey === "monster") {
        isPrimary = false;
    }
    const timeDimClass = shouldDimByRealtimeTime(entity) ? "time-dim" : "";

    return L.divIcon({
        className: "photo-marker-wrap",
        html: `
      <div class="marker-fallback-dot rarity-${rarityKey} category-${categoryKey}" ></div>
      <img class="photo-marker rarity-${rarityKey} ${timeDimClass} ${bubbleHintClass} ${isPrimary ? "primary-location" : ""} ${caughtClass}"
        src="${getImagePath(entity)}"
        alt="${label(entity)}"
        onerror="this.style.display='none';this.previousElementSibling.style.display='block';"
      >
      ${markerNumber ? `<span class="marker-number ${timeDimClass}">${markerNumber}</span>` : ""}
      ${caught ? `<span class="caught-v marker-v ${timeDimClass}">✓</span>` : ""}
    `,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -16]
    });
}

function markerVisualSignature(entity, isPrimary) {
    const activeMonsterIndex = getMonsterRotationActiveIndex(entity);
    return `${entity.rarity}|${entity.category}|${isPrimary ? "1" : "0"}|${isCaught(entity) ? "1" : "0"}|${monsterRotationRevealed ? "1" : "0"}|${activeMonsterIndex ?? "x"}|${shouldDimByRealtimeTime(entity) ? "D" : "N"}`;
}

function getMarkerBundle(mapId, entity) {
    const key = entityKey(entity, mapId);
    let byMap = markerBundleCache.get(mapId);
    if (!byMap) {
        byMap = new Map();
        markerBundleCache.set(mapId, byMap);
    }
    let bundle = byMap.get(key);
    if (bundle) return bundle;

    const locs = Array.isArray(entity.locations) ? entity.locations : [];
    const markers = locs.map((l, idx) => {
        const marker = L.marker([l.y, l.x], {icon: markerIcon(entity, idx === 0, idx,l.hint_by_bubble)});
        marker.on("click", () => openEntityDetail(entity, idx));
        return marker;
    });
    bundle = {
        key,
        markers,
        iconSignatures: markers.map((_, idx) => markerVisualSignature(entity, idx === 0))
    };
    byMap.set(key, bundle);
    return bundle;
}

function updateMarkerBundleIcons(bundle, entity) {
    bundle.markers.forEach((marker, idx) => {
        const nextSig = markerVisualSignature(entity, idx === 0);
        if (bundle.iconSignatures[idx] === nextSig) return;
        marker.setIcon(markerIcon(entity, idx === 0, idx));
        bundle.iconSignatures[idx] = nextSig;
    });
}

function syncMarkerBundleLayers(bundle, entity) {
    let hasVisibleMarker = false;
    bundle.markers.forEach((marker, idx) => {
        const shouldShow = !shouldHideMarkerByRotation(entity, idx);
        if (shouldShow) {
            hasVisibleMarker = true;
            if (!markerLayer.hasLayer(marker)) markerLayer.addLayer(marker);
        } else if (markerLayer.hasLayer(marker)) {
            markerLayer.removeLayer(marker);
        }
    });
    return hasVisibleMarker;
}

function scheduleRenderMarkers(refreshPanel = true) {
    if (refreshPanel) scheduledRefreshPanel = true;
    if (renderScheduled) return;
    renderScheduled = true;
    requestAnimationFrame(() => {
        renderScheduled = false;
        const shouldRefreshPanel = scheduledRefreshPanel;
        scheduledRefreshPanel = false;
        void renderMarkers(shouldRefreshPanel);
    });
}

function getImagePath(entity) {
    return `./assets/maps/${currentMapId}/portraits/${entity.category}/${entity.id}.png`;
}

function getFigureImage(entity) {
    return `./assets/maps/${currentMapId}/portraits/${entity.category}/figure/${entity.id}W.png`;
}

function getLabelWithCategory(value) {
    const map = {
        fish: "물고기",
        creature: "생명체",
        item: "아이템",
        monster: "몬스터",
    };
    return map[value] || "알수없음";
}

function availabilityTimeLabel(values) {
    if (!values || values.length === 0) return "종일";
    const map = {"day": "낮", "night": "밤", "both": "종일"};
    const labels = values.map((v) => map[v]).filter(Boolean);
    return labels.length ? labels.join(", ") : "종일";
}

function shadowSizeLabel(values) {
    if (!values || values.length === 0) return "없음";
    const map = {0: "작음", 1: "보통", 2: "중형", 3: "대형"};
    const labels = values.map((v) => map[v]).filter(Boolean);
    return labels.length ? labels.join(", ") : "없음";
}

function shadowSpeedLabel(values) {
    if (!values || values.length === 0) return "없음";
    const map = {0: "정지", 1: "보통", 2: "빠름"};
    const labels = values.map((v) => map[v]).filter(Boolean);
    return labels.length ? labels.join(", ") : "없음";
}

function isSeasonAvailable(entity) {
    if (!Array.isArray(entity.seasons) || entity.seasons.length !== 12) return true;
    return Boolean(entity.seasons[new Date().getMonth()]);
}

function seasonBar(entity) {
    if (!Array.isArray(entity.seasons) || entity.seasons.length !== 12) return "";
    if (entity.seasons.every((v) => v === true)) {
        entity.seasons = [true, true, true, true, true, true, true, true, true, true, true, true];
    }
    const currentMonth = new Date().getMonth();
    const blocks = entity.seasons
    .map((ok, idx) => {
        const active = ok ? "on" : "off";
        const now = idx === currentMonth ? "now" : "";
        return `<span class="mcell ${active} ${now}">${idx + 1}</span>`;
    })
    .join("");
    return `<div class="season-wrap"><div class="season-grid">${blocks}</div><div class="season-now">현재 달: ${currentMonth + 1}월</div></div>`;
}

function minigameMeta(entity) {
    const d = entity.difficulty;
    if (d === null || d === undefined || d === 0) return {label: "없음", cls: "none"};
    if (d === 1) return {label: "고정", cls: "fixed"};
    if (d === 2) return {label: "움직임", cls: "moving"};
    return {label: "회전", cls: "rotate"};
}

function hitFishTimeFilter(entity) {
    if (entity.timeBand === "day") return filters.time.has("day");
    if (entity.timeBand === "night") return filters.time.has("night");
    if (entity.timeBand === "both") return filters.time.has("both");
    return false;
}

function buildPicker() {
    mapPicker.innerHTML = "";
    mapOrder.forEach((mapId) => {
        const mapInfo = mapsById[mapId];
        const button = document.createElement("button");
        button.type = "button";
        button.className = "map-chip";
        button.dataset.mapId = mapInfo.id;
        button.innerHTML = `<img src="${mapInfo.thumbnailPath}" alt="${mapInfo.name}"><span>${mapInfo.name}</span>`;
        button.addEventListener("click", () => selectMap(mapInfo.id));
        mapPicker.appendChild(button);
    });
    const tipsButton = document.createElement("button");
    tipsButton.type = "button";
    tipsButton.className = "map-chip tips-chip";
    tipsButton.dataset.mapId = TIPS_PAGE_ID;
    tipsButton.innerHTML = "<span>Tips</span>";
    tipsButton.addEventListener("click", () => selectTipsPage());
    mapPicker.appendChild(tipsButton);
}

function applyPickerState() {
    const chips = mapPicker.querySelectorAll(".map-chip");
    chips.forEach((chip) => {
        const active = isTipsMode ? chip.dataset.mapId === TIPS_PAGE_ID : chip.dataset.mapId === currentMapId;
        chip.classList.toggle("active", active);
    });
}

function applyViewMode() {
    document.body.classList.toggle("tips-mode", isTipsMode);
    controlsSection.hidden = isTipsMode;
    mapLayout.hidden = isTipsMode;
    tipsLayout.hidden = !isTipsMode;
    if (isTipsMode && isMapFullscreen) exitMapFullscreen();
    updateTodaySpotToggleButton();
}

function syncMapFullscreenState(active) {
    const useMobileOverlay = active && window.matchMedia("(max-width: 860px)").matches;
    isMapFullscreen = active;
    document.body.classList.toggle("map-fullscreen", active);
    mapLayout.classList.toggle("map-layout-fullscreen", active);
    controlsSection.classList.toggle("map-filter-overlay", useMobileOverlay);
    fullscreenToggleBtn.classList.toggle("on", active);

    fullscreenToggleBtn?.setAttribute("aria-pressed", active ? "true" : "false");
    if (useMobileOverlay) {
        mapLayout.appendChild(controlsSection);
    } else {
        controlsHome.parent.insertBefore(controlsSection, controlsHome.nextSibling);
        controlsSection.hidden = isTipsMode;
    }

    requestAnimationFrame(() => {
        mapInstance?.invalidateSize();
    });
    saveUserState();
}

function enterMapFullscreen() {
    if (isTipsMode) return;
    syncMapFullscreenState(true);
    fitCurrentMapBounds();
}

function exitMapFullscreen() {
    syncMapFullscreenState(false);
    fitCurrentMapBounds();
}

function toggleMapFullscreen() {
    if (isMapFullscreen) exitMapFullscreen();
    else enterMapFullscreen();
}

function handleViewportChange() {
    if (isMapFullscreen) syncMapFullscreenState(true);
    fitCurrentMapBounds();
}

window.addEventListener("resize", handleViewportChange);
window.addEventListener("orientationchange", () => {
    setTimeout(() => {
        mapInstance?.invalidateSize();
        fitCurrentMapBounds();
    }, 300);
});

function updateTodaySpotToggleButton() {
    if (!todaySpotToggleBtn) return;
    todaySpotToggleBtn.classList.toggle("on", monsterRotationRevealed);
    todaySpotToggleBtn.setAttribute("aria-pressed", monsterRotationRevealed ? "true" : "false");
}

function updateAlwaysShowBossButton() {
    if (!alwaysShowBossBtn) return;
    alwaysShowBossBtn.classList.toggle("on", alwaysShowBoss);
    alwaysShowBossBtn.setAttribute("aria-pressed", alwaysShowBoss ? "true" : "false");
}

function updateRealtimeTimeToggleButton() {

    const isDay = isRealtimeDayTime();
    realtimeTimeToggleBtn.textContent = isDay ? " 실시간 ☀️️" : "실시간 🌙"

    if (!realtimeTimeToggleBtn) return;
    realtimeTimeToggleBtn.classList.toggle("on", realtimeTimeFilterEnabled);
    realtimeTimeToggleBtn.setAttribute("aria-pressed", realtimeTimeFilterEnabled ? "true" : "false");
}

function applyFilterButtonState() {
    filterButtons.forEach((btn) => {
        const group = btn.dataset.group;
        const value = btn.dataset.value;
        btn.classList.toggle("active", filters[group].has(value));
    });
}

// 모바일에서 한 손가락 더블탭으로 확대, 두 손가락 더블탭으로 축소 기능을 구현합니다.
// iOS Safari의 경우 페이지 전체의 핀치/더블탭 줌이 방해될 수 있어,
//  map 영역 외에서는 300ms 이내의 터치가 발생하면 기본 동작을 막도록 했습니다.
//  map 영역에서는 별도의 로직으로 처리합니다.
function installSingleFingerDoubleTapZoomIn() {
    const el = mapInstance.getContainer();
    let lastTap = 0;
    el.addEventListener("touchstart", (event) => {
        // 한 손가락만
        if (event.touches.length !== 1) {
            return;
        }
        const now = Date.now();
        if (now - lastTap <= 300) {
            mapInstance.zoomIn();
            event.preventDefault();
            lastTap = 0;
            return;
        }
        lastTap = now;
    }, {passive: false});
}

function installTwoFingerDoubleTapZoomOut() {
    const el = mapInstance.getContainer();
    let lastTwoFingerTapAt = 0;
    el.addEventListener("touchstart", (event) => {
        if (event.touches.length !== 2) {
            return;
        }
        const now = Date.now();
        if (now - lastTwoFingerTapAt <= 300) {
            mapInstance.zoomOut();
            event.preventDefault();
            lastTwoFingerTapAt = 0;
            return;
        }
        lastTwoFingerTapAt = now;
    }, {passive: false});
}

function createMapIfNeeded() {
    if (mapInstance) return;
    mapInstance = L.map("map", {
        crs: L.CRS.Simple,
        minZoom: -3,
        maxZoom: 2,
        zoomSnap: 0.05,
        preferCanvas: true,
        zoomControl: false,
        attributionControl: false,
        zoomAnimation: false,
        fadeAnimation: false,
        doubleClickZoom: true
    });
    markerLayer = L.layerGroup().addTo(mapInstance);
    installSingleFingerDoubleTapZoomIn();
    installTwoFingerDoubleTapZoomOut();
}

function buildDetailHtml(entity, spotIndex = null) {
    const mini = minigameMeta(entity);
    const miniHtml = mini
        ? `<p><strong>미니게임:</strong> <span class="minigame-pill minigame-${mini.cls}">${mini.label}</span></p>`
        : "";
    const latinHtml = `<div class="detail-wide-row"><strong>학명:</strong> ${entity.latin || "-"}</div>`;
    const seasonHtml = seasonBar(entity);
    const noteHtml = entity.notes && entity.notes.trim() !== ""
        ? `<div class="detail-note"><strong>메모:</strong> ${entity.notes}</div>`
        : "";
    const spotImageBasePath = getSpotImageBasePath(entity, spotIndex);
    const spotHtml = spotImageBasePath ? buildSpotImagesHtml(spotImageBasePath) : "";

    const caught = isCaught(entity);
    return `
      <div class="fish-popup detail-theme">
        <div class="detail-title-row">
          <div class="detail-name-row">
            <div class="detail-title-display-name">
              <h3>${label(entity)}</h3>          
            </div>
            <div class="detail-title-origin-name">
              ${entity.name}
            </div>
          </div>
          <div class="detail-title-actions">
            <button class="caught-toggle ${caught ? "on" : ""}" data-action="toggle-caught" data-id="${entity.id}" data-category="${entity.category}" type="button">${caught ? "잡음 ✓" : "미획득"}</button>
            <button class="detail-close-inline" type="button" aria-label="닫기"> 닫기 </button>
          </div>
        </div>
              
        <div class="detail-layout">
          <div class="detail-info">
            <p><strong>분류:</strong> ${getLabelWithCategory(entity.category)}</p>
            <p><strong>활성 시간:</strong> ${availabilityTimeLabel([entity.timeBand])}</p>
            <p><strong>희귀도:</strong> <span class="rarity-pill rarity-${entity.rarity}">${entity.rarity}</span></p>
            <p><strong>그림자 크기:</strong> ${shadowSizeLabel(entity.shadowSizes)}</p>
            <p><strong>그림자 속도:</strong> ${shadowSpeedLabel(entity.shadowSpeeds)}</p>
            ${miniHtml}
          </div>        
          <div class="detail-visual">
              <img class="detail-entity-image" src="${getFigureImage(entity)}" alt="${label(entity)}" onerror="this.style.display='none';">
          </div>
        </div>
        <div class="detail-bottom">
          ${latinHtml}
          ${seasonHtml}
          ${noteHtml}
          ${spotHtml}
        </div>
      </div>`;
}

function buildSpotImagesHtml(basePath) {
    return `
        <div class="entity-spot" data-base-path="${basePath}" data-max-variant="6" style="display:none;"></div>
    `;
}

function getSpotImageBasePath(entity, spotIndex = null) {
    if (entity.category === "monster") {
        return spotIndex === null ? null : getMonsterSpotImageBasePath(spotIndex);
    }
    if (!["fish", "creature", "item"].includes(entity.category)) return null;
    return getEntitySpotImageBasePath(entity);
}

function getEntitySpotImageBasePath(entity) {
    return `./assets/maps/${currentMapId}/portraits/${entity.category}/spot/${entity.id}P`;
}

function getMonsterSpotImageBasePath(index) {
    const spotNumber = index + 1;
    return `./assets/maps/${currentMapId}/portraits/monster/spot/spot${spotNumber}`;
}

function initializeSpotImages(root = document) {
    root.querySelectorAll(".entity-spot[data-base-path]").forEach((container) => {
        loadNextSpotImage(container, 0);
    });
}

function loadNextSpotImage(container, variant) {
    const basePath = container.dataset.basePath;
    const maxVariant = Number(container.dataset.maxVariant || 0);
    if (!basePath || variant > maxVariant) return;

    const image = document.createElement("img");
    image.onload = () => {
        container.style.display = "flex";
        loadNextSpotImage(container, variant + 1);
    };
    image.onerror = () => {
        image.remove();
        if (container.children.length === 0) container.style.display = "none";
    };
    image.src = variant === 0 ? `${basePath}.png` : `${basePath}-${variant}.png`;
    container.appendChild(image);
}

async function loadMapEntities(mapId) {
    if (mapEntitiesCache.has(mapId)) return mapEntitiesCache.get(mapId);
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
        byCategory: emptyCategorizedEntityMap()
    };

    for (const entity of all) {
        cache.byCategory[entity.category].push(entity);
    }
    mapEntitiesCache.set(mapId, cache);
    return cache;
}

function passesCurrentFilters(entity) {
    if (entity.category === "monster") {
        return alwaysShowBoss;
    }
    if (!filters.category.has(entity.category)) return false;
    if (!filters.rarity.has(entity.rarity)) return false;
    if (!hitFishTimeFilter(entity)) return false;
    const availableNow = isSeasonAvailable(entity);
    const availabilityKey = availableNow ? "available" : "unavailable";
    if (!filters.availability.has(availabilityKey)) return false;
    const mode = getGroupCaughtMode(entity.category);
    if (mode === "caught" && !isCaught(entity)) return false;
    return !(mode === "uncaught" && isCaught(entity));
}

async function renderMarkers(refreshPanel = true) {
    const requestId = ++renderRequestId;
    const mapInfo = mapsById[currentMapId];
    // const entities = await loadMapEntities(currentMapId);
    const cache = await loadMapEntities(currentMapId);

    if (requestId !== renderRequestId || mapInfo.id !== currentMapId) return;

    const filtered = cache.all.filter((entity) => passesCurrentFilters(entity));

    lastFilteredEntities = filtered;
    let activeStateChanged = false;
    if (resetActiveOnNextRender || !initializedActiveMapIds.has(currentMapId)) {
        resetActiveEntitiesForMap(filtered);
        resetActiveOnNextRender = false;
        activeStateChanged = true;
    }
    if (refreshPanel) renderEntityPanel();
    if (activeStateChanged) saveUserState();

    const nextActiveKeys = new Set();
    filtered.forEach((entity) => {
        if (!isEntityActive(entity)) {
            return;
        }
        const locs = Array.isArray(entity.locations) ? entity.locations : [];
        if (locs.length === 0) return;
        const bundle = getMarkerBundle(currentMapId, entity);
        updateMarkerBundleIcons(bundle, entity);
        if (syncMarkerBundleLayers(bundle, entity)) nextActiveKeys.add(bundle.key);
    });

    activeMarkerKeys.forEach((key) => {
        if (nextActiveKeys.has(key)) return;
        const [mapId] = key.split(":");
        const byMap = markerBundleCache.get(mapId);

        const bundle = byMap?.get(key);
        if (!bundle) return;
        bundle.markers.forEach((marker) => markerLayer.removeLayer(marker));
    });

    activeMarkerKeys.clear();
    nextActiveKeys.forEach((key) => activeMarkerKeys.add(key));
}

function renderEntityPanel() {
    syncCaughtFilterAllButton();
    const categoryRank = {fish: 0, creature: 1, item: 2};
    const categoryLabel = {fish: "물고기", creature: "생명체", item: "아이템"};
    const rarityRank = {common: 0, rare: 1, epic: 2, monster: 3};
    const sorted = [...lastFilteredEntities].sort((a, b) => {
        const ca = categoryRank[a.category] ?? 9;
        const cb = categoryRank[b.category] ?? 9;
        if (ca !== cb) return ca - cb;
        const ra = rarityRank[a.rarity] ?? 9;
        const rb = rarityRank[b.rarity] ?? 9;
        if (ra !== rb) return ra - rb;
        return label(a).localeCompare(label(b));
    });
    const visibleCategories = ["fish", "creature", "item"].filter((category) => filters.category.has(category));

    const sections = visibleCategories.map((category) => {
        const groupItems = sorted.filter(e => e.category === category);

        const ui = getOrCreateGroupUi(category, categoryLabel[category]);
        ui.caughtFilterBtn.textContent = caughtModeLabel(caughtFilterMode[category]);

        updateGroupHeaderState(category);
        ui.arrowEl.textContent = panelFoldState[category] ? "▾" : "▸";
        ui.body.className = `entity-group-body ${panelFoldState[category] ? "open" : "closed"}`;

        const rowNodes = groupItems.map((entity) => {
            const rowUi = getOrCreateEntityRow(entity);
            updateEntityRow(rowUi, entity);
            return rowUi.row;
        });
        if (rowNodes.length === 0) {
            ui.body.replaceChildren(ui.emptyEl);
        } else {
            ui.body.replaceChildren(...rowNodes);
        }
        return ui.section;
    });
    entityList.replaceChildren(...sections);
}

function getOrCreateGroupUi(category, labelText) {
    const cached = groupUiCache.get(category);
    if (cached) return cached;

    const section = document.createElement("section");
    section.className = "entity-group";

    const header = document.createElement("div");
    header.className = "entity-group-head";
    header.setAttribute("role", "button");
    header.setAttribute("tabindex", "0");
    header.innerHTML = `
      <span>${labelText}</span>
      <span class="entity-group-info"></span>
      <button type="button" class="entity-group-caught-filter-btn" data-category="${category}"></button>
      <button type="button" class="entity-group-show-toggle-btn" data-category="${category}"></button>
      <span class="entity-group-count"></span>
      <span class="entity-group-arrow"></span>
  `;
    const body = document.createElement("div");
    body.className = "entity-group-body open";
    const emptyEl = document.createElement("div");
    emptyEl.className = "entity-empty";
    emptyEl.textContent = "표시할 항목 없음";

    section.append(header, body);
    const ui = {
        section,
        header,
        body,
        emptyEl,
        toggleBtn: header.querySelector(".entity-group-show-toggle-btn"),
        caughtFilterBtn: header.querySelector(".entity-group-caught-filter-btn"),
        infoEl: header.querySelector(".entity-group-info"),
        countEl: header.querySelector(".entity-group-count"),
        arrowEl: header.querySelector(".entity-group-arrow")
    };

    header.addEventListener("click", () => {
        panelFoldState[category] = !panelFoldState[category];
        renderEntityPanel();
    });
    header.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        panelFoldState[category] = !panelFoldState[category];
        renderEntityPanel();
    });
    ui.toggleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const group = lastFilteredEntities.filter((ent) => ent.category === category);

        const allActive = group.length > 0 && group.every((ent) => isEntityActive(ent));
        group.forEach((ent) => {
            const key = entityKey(ent);
            if (allActive) activeEntityKeys.delete(key);
            else activeEntityKeys.add(key);
        });
        initializedActiveMapIds.add(currentMapId);
        saveUserState();
        scheduleRenderMarkers();
        renderEntityPanel();
    });
    ui.caughtFilterBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        caughtFilterMode[category] = nextCaughtMode(caughtFilterMode[category]);
        syncCaughtFilterAllButton();
        saveUserState();
        scheduleRenderMarkers();
    });

    groupUiCache.set(category, ui);
    return ui;
}

function getOrCreateEntityRow(entity) {
    const key = entityKey(entity);
    const cached = entityRowCache.get(key);
    if (cached) return cached;

    const row = document.createElement("div");
    row.innerHTML = `
    <span class="entity-left">
      <span class="entity-thumb-wrap">
        <img class="entity-thumb"  alt="" src="">
        <span class="entity-available-time-badge">∞</span>
      </span>
      <span class="entity-texts">
        <span class="entity-name"></span>
        <span class="entity-sub-name"></span>
      </span>
    </span>
    <span class="entity-count"></span>
    <button class="count-v-toggle" type="button" aria-label="획득 토글">
      <span class="caught-v count-v off">✓</span>
    </button>
  `;
    const rowUi = {
        row,
        thumb: row.querySelector(".entity-thumb"),
        thumbWrap: row.querySelector(".entity-thumb-wrap"),
        timeIconBadge: row.querySelector(".entity-available-time-badge"),
        nameEl: row.querySelector(".entity-name"),
        subNameEl: row.querySelector(".entity-sub-name"),
        countEl: row.querySelector(".entity-count"),
        countVEl: row.querySelector(".count-v")
    };

    row.addEventListener("click", () => {
        const key = entityKey(entity);
        if (activeEntityKeys.has(key)) activeEntityKeys.delete(key);
        else activeEntityKeys.add(key);
        initializedActiveMapIds.add(currentMapId);
        updateEntityRow(rowUi, entity);
        const categoryKey = entity.category;
        updateGroupHeaderState(categoryKey);
        saveUserState();
        scheduleRenderMarkers(false);
    });
    rowUi.thumb.addEventListener("click", (event) => {
        event.stopPropagation();
        openEntityDetail(entity);
    });
    row.querySelector(".count-v-toggle").addEventListener("click", (event) => {
        event.stopPropagation();
        const keyByEntity = entityKey(entity);
        if (caughtEntityKeys.has(keyByEntity)) caughtEntityKeys.delete(keyByEntity);
        else caughtEntityKeys.add(keyByEntity);
        saveUserState();
        scheduleRenderMarkers();
    });

    entityRowCache.set(key, rowUi);
    return rowUi;
}

function updateEntityRow(rowUi, entity) {
    const rarityKey = entity.rarity;
    rowUi.row.className = `entity-row rarity-${rarityKey} ${isEntityActive(entity) ? "" : "off"} ${isCaught(entity) ? "caught" : ""}`;
    const count = Array.isArray(entity.locations) ? entity.locations.length : 0;
    rowUi.countEl.textContent = String(count);
    rowUi.countVEl.className = `caught-v count-v ${isCaught(entity) ? "on" : "off"}`;
    rowUi.nameEl.className = `entity-name rarity-${rarityKey}`;
    rowUi.nameEl.textContent = label(entity);
    rowUi.subNameEl.textContent = entity.name || "";
    const imagePath = getImagePath(entity);
    if (rowUi.thumb.getAttribute("src") !== imagePath) {
        rowUi.thumb.src = imagePath;
    }
    rowUi.thumb.alt = label(entity);
    rowUi.thumb.onerror = function onThumbError() {
        this.style.display = "none";
    };
    const dimmed = shouldDimByRealtimeTime(entity);
    rowUi.thumb.style.display = "";
    rowUi.thumb.classList.toggle("time-dim", dimmed);
    rowUi.timeIconBadge.classList.toggle("time-dim", dimmed);
    if (entity.category === "item") {
        rowUi.timeIconBadge.textContent = ""
    } else {
        rowUi.timeIconBadge.textContent = {
            day: "☀️", // 해
            night: "🌙" // 달
        }[entity.timeBand] ?? "∞";// 종일
    }
}

function updateGroupHeaderState(category) {
    const ui = groupUiCache.get(category);
    if (!ui) return;
    const groupItems = lastFilteredEntities.filter((ent) => ent.category === category);
    const allActive = groupItems.length > 0 && groupItems.every((ent) => isEntityActive(ent));
    ui.toggleBtn.textContent = allActive ? "🚫" : "👁️";// 눈  숨김

    const cache = mapEntitiesCache.get(currentMapId);
    const totalEntries = cache.byCategory[category];
    const caughtCount = totalEntries.filter((entry) => isCaught(entry)).length;
    ui.infoEl.textContent = String(caughtCount) + "/" + String(totalEntries.length);

    const activeCount = groupItems.filter((entry) => isEntityActive(entry)).length;
    ui.countEl.textContent = String(activeCount) + "/" + String(groupItems.length);
}

function openDetail(html) {
    detailBody.innerHTML = html;
    initializeSpotImages(detailBody);
    detailSheet.classList.add("open");
    detailSheet.setAttribute("aria-hidden", "false");
}

function openEntityDetail(entity, spotIndex = null) {
    currentDetailEntity = entity;
    openDetail(buildDetailHtml(entity, spotIndex));
}

function closeDetail() {
    detailSheet.classList.remove("open");
    detailSheet.setAttribute("aria-hidden", "true");
    currentDetailEntity = null;
}

function toggleEntityPanel() {
    const isMobile = window.matchMedia("(max-width: 860px)").matches;
    if (!isMobile && !isMapFullscreen) return;
    const panel = document.getElementById("entityPanel");
    const nextOpen = !panel.classList.contains("open");
    panelToggleBtn.classList.toggle("on", nextOpen);
    panel.classList.toggle("open", nextOpen);
}

function fitCurrentMapBounds() {
    if (!mapInstance) return;
    const mapInfo = mapsById[currentMapId];
    const bounds = [[0, 0], [mapInfo.imageHeight, mapInfo.imageWidth]];
    mapInstance.invalidateSize();
    requestAnimationFrame(() => {
        mapInstance.fitBounds(bounds, {
            padding: [0, 0],
            animate: false
        });
    });
}

function renderMap() {
    const mapInfo = mapsById[currentMapId];
    const bounds = [[0, 0], [mapInfo.imageHeight, mapInfo.imageWidth]];
    if (mapInfo.imageWidth && mapInfo.imageHeight) {
        mapLayout.style.setProperty("--active-map-aspect", mapInfo.imageWidth / mapInfo.imageHeight);
    }
    updateTodaySpotToggleButton();

    mapInstance.eachLayer((layer) => {
        if (layer instanceof L.ImageOverlay) mapInstance.removeLayer(layer);
    });

    L.imageOverlay(mapInfo.imagePath, bounds).addTo(mapInstance);
    fitCurrentMapBounds();

    // 여기서 부터 클릭 부분==================
    mapInstance.off("click");
    mapInstance.on("click", async (e) => {
        // ALT + 클릭만 동작
        if (!e.originalEvent.altKey) return;
        const point = {
            x: Math.round(e.latlng.lng),
            y: Math.round(e.latlng.lat),
        };

        // 보기 쉽게 문자열 생성
        const text = `"x": ${point.x}, "y": ${point.y}, "hint_by_bubble" : true`;
        await navigator.clipboard.writeText(text);
        showToast("Copy to clipboard: " + text);
        console.log(text);
    });
    // 클릭 끝 ==================

    requestAnimationFrame(() => {
        mapInstance.invalidateSize();
    });
    scheduleRenderMarkers();
}

function showToast(message, duration = 1000) {
    const toast = document.createElement("div");
    toast.textContent = message;
    toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #333;
    color: #fff;
    padding: 10px 16px;
    border-radius: 4px;
    z-index: 9999;
  `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, duration);
}

function selectMap(mapId) {
    closeDetail();
    if (!isTipsMode && currentMapId === mapId) {
        applyPickerState();
        return;
    }
    isTipsMode = false;
    currentMapId = mapId;
    applyViewMode();
    applyPickerState();
    saveUserState();
    renderMap();
}

function selectTipsPage() {
    closeDetail();
    isTipsMode = true;
    applyViewMode();
    applyPickerState();
    saveUserState();
}

function clearFilterGroup(group) {
    if (filters[group].size > 0) {
        filters[group].clear();
    } else {
        filters[group] = new Set(defaults[group]);
    }
    applyFilterButtonState();
    // applyFishOnlyState();
    // resetActiveOnNextRender = true;
    saveUserState();
    scheduleRenderMarkers();
}

function isRealtimeDayTime() {
    const h = new Date().getHours();
    return h >= 4 && h < 20;
}

function shouldDimByRealtimeTime(entity) {
    if (!realtimeTimeFilterEnabled) return false;
    if (entity.timeBand === "both") return false;
    const isDay = isRealtimeDayTime();
    return (isDay && entity.timeBand === "night") ||
        (!isDay && entity.timeBand === "day");
}

document.addEventListener("DOMContentLoaded", () => {
    loadUserState();
    buildPicker();
    applyViewMode();
    applyPickerState();
    createMapIfNeeded();
    applyFilterButtonState();
    syncCaughtFilterAllButton();
    updateAlwaysShowBossButton();
    updateTodaySpotToggleButton();
    updateRealtimeTimeToggleButton();

    filterButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            const group = btn.dataset.group;
            const value = btn.dataset.value;
            const set = filters[group];
            if (set.has(value)) set.delete(value);
            else set.add(value);
            applyFilterButtonState();
            // resetActiveOnNextRender = true;
            saveUserState();
            scheduleRenderMarkers();
        });
    });

    clearButtons.forEach((btn) => {
        btn.addEventListener("click", () => clearFilterGroup(btn.dataset.clearGroup));
    });
    exportStateBtn?.addEventListener("click", exportUserState);
    importStateBtn?.addEventListener("click", () => showImportUserStateDialog());

    document.getElementById("btnImportCancel").addEventListener("click", () => {
        importedStateDialog.close();
    });

    document.getElementById("btnImportOk").addEventListener("click", () => {
        importUserStateFile(importedTextContents.value);
        importedStateDialog.close();
    });

    // uncatchOnlyBtn
    uncaughtOnlyBtn.addEventListener("click", () => {

        let uncaughtEntry = lastFilteredEntities.filter(entry => !isCaught(entry));
        resetActiveEntitiesForMap(uncaughtEntry);

        lastFilteredEntities.forEach((e) => {
            if (e.category === "monster") activeEntityKeys.add(entityKey(e));
        });

        saveUserState();
        scheduleRenderMarkers();
    });
    showAllBtn.addEventListener("click", () => {
        resetActiveEntitiesForMap(lastFilteredEntities);
        saveUserState();
        scheduleRenderMarkers();
    });
    hideAllBtn.addEventListener("click", () => {
        const prefix = currentMapKeyPrefix();
        activeEntityKeys.forEach((key) => {
            if (key.startsWith(prefix)) activeEntityKeys.delete(key);
        });
        lastFilteredEntities.forEach((e) => {
            if (e.category === "monster") activeEntityKeys.add(entityKey(e));
        });
        initializedActiveMapIds.add(currentMapId);
        saveUserState();
        scheduleRenderMarkers();
    });
    caughtFilterAllBtn?.addEventListener("click", () => {
        const current = caughtFilterMode.fish;
        const next = nextCaughtMode(current);
        caughtFilterMode.fish = next;
        caughtFilterMode.creature = next;
        caughtFilterMode.item = next;
        syncCaughtFilterAllButton();
        saveUserState();
        scheduleRenderMarkers();
    });
    /*Tool Bar*/
    alwaysShowBossBtn?.addEventListener("click", () => {
        alwaysShowBoss = !alwaysShowBoss;
        saveUserState();
        updateAlwaysShowBossButton();
        scheduleRenderMarkers(false);
    });

    todaySpotToggleBtn?.addEventListener("click", () => {
        monsterRotationRevealed = !monsterRotationRevealed;
        saveUserState(); // 추가
        updateTodaySpotToggleButton();
        scheduleRenderMarkers(false);
    });

    panelToggleBtn.addEventListener("click", toggleEntityPanel);

    const isDay = isRealtimeDayTime();
    realtimeTimeToggleBtn.textContent = isDay ? " 실시간 ☀️️" : "실시간 🌙"
    realtimeTimeToggleBtn?.addEventListener("click", () => {
        realtimeTimeFilterEnabled = !realtimeTimeFilterEnabled;
        saveUserState();
        updateRealtimeTimeToggleButton();
        scheduleRenderMarkers(true);
    });

    fullscreenToggleBtn?.addEventListener("click", toggleMapFullscreen);
    /*Tool Bar*/
    document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        if (isMapFullscreen) {
            exitMapFullscreen();
        }
        if (detailSheet.classList.contains("open")) {
            closeDetail();
        }
    });

    mapPicker?.addEventListener('wheel', (event) => {
        if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
            // 기본 세로 스크롤 동작을 막습니다.
            event.preventDefault();
            // 휠을 위/아래로 굴릴 때 가로(왼쪽/오른쪽)로 스크롤되도록 설정합니다.
            // event.deltaY 값을 scrollLeft에 더해줌으로써 부드럽게 이동합니다.
            mapPicker.scrollLeft += event.deltaY;
        }
    }, {passive: false}); // preventDefault()를 사용하기 위해 passive를 false로 설정합니다.

    detailClose.addEventListener("click", closeDetail);
    detailBackdrop.addEventListener("click", closeDetail);
    detailSheet.addEventListener("click", (event) => {
        if (!detailBody.contains(event.target)) closeDetail();
    });
    detailBody.addEventListener("click", (event) => {
        event.stopPropagation();
        if (event.target.classList.contains("detail-close-inline")) closeDetail();
        const toggle = event.target.closest("[data-action='toggle-caught']");
        if (!toggle) return;
        const id = toggle.dataset.id;
        const category = toggle.dataset.category;
        const entity = currentDetailEntity;
        if (!entity) return;
        if (entity.id !== id || entity.category !== category) return;
        const key = entityKey(entity);
        if (caughtEntityKeys.has(key)) caughtEntityKeys.delete(key);
        else caughtEntityKeys.add(key);
        saveUserState();
        openEntityDetail(entity);
        scheduleRenderMarkers();
    });
    if (isTipsMode) selectTipsPage();
    else {
        renderMap();
        if (isMapFullscreen) {
            requestAnimationFrame(() => {
                syncMapFullscreenState(true);
                fitCurrentMapBounds();
            });
        }
    }
});
