// data
import {mapOrder, mapsById} from "../content/mapIndex.js";

// state
import {createEmptyCategorizedEntityMap, state} from "./state/state.js";
import PersistedState from "./state/persistedState.js";

// constants
import {MONSTER_ROTATION_CONFIG, MONSTER_ROTATION_MAP_IDS} from "./constants/index.js";

// repository
// ui
import {showToast} from "./ui/toast.js";

//map
import MarkerManager from "./map/markerManager.js";
import EntityPanel from "./ui/entityPanel.js";
import DetailPanel from "./ui/detailPanel.js";

MarkerManager.setDependencies({
    loadMapEntities,
    renderEntityPanel: (...args) => EntityPanel.render(...args),
    passesCurrentFilters,
    resetActiveEntitiesForMap,
    isEntityActive,
    entityKey,
    isCaught,
    label,
    shouldDimByRealtimeTime,
    shouldHideMarkerByRotation,
    getMonsterRotationActiveIndex,
    openEntityDetail: (...args) => {
        DetailPanel.openEntityDetail(...args)
    },
});

EntityPanel.setDependencies({
    isEntityActive,
    isCaught,
    entityKey,
    label,
    shouldDimByRealtimeTime,
    openEntityDetail: (...args) => {
        DetailPanel.openEntityDetail(...args)
    },
    resetActiveEntitiesForMap,
    saveAndRender
});

DetailPanel.setDependencies({
    isCaught,
    entityKey,
    label,
    toggleCaught
});

const mapPicker = document.getElementById("mapPicker");
const filterButtons = document.querySelectorAll(".filter-btn[data-group]");

const exportStateBtn = document.getElementById("exportStateBtn");
const importStateBtn = document.getElementById("importStateBtn");
const importedStateDialog = document.getElementById("importStateDialog");
const importedTextContents = document.getElementById("importStateText");

const alwaysShowBossBtn = document.getElementById("alwaysShowBossBtn");
const todaySpotToggleBtn = document.getElementById("todaySpotToggleBtn");
const realtimeTimeToggleBtn = document.getElementById("realtimeTimeToggleBtn");

const fullscreenToggleBtn = document.getElementById("fullscreenToggleBtn");
const controlsSection = document.getElementById("controls");
const mapLayout = document.getElementById("mapLayout");
const tipsLayout = document.getElementById("tipsLayout");

const TIPS_PAGE_ID = "__tips__";

state.currentMapId = mapOrder[0];

function getGroupCaughtMode(category) {
    return state.caughtFilterMode[category] || "all";
}

function entityKey(entity, mapId = state.currentMapId) {
    return `${mapId}:${entity.category}:${entity.id}`;
}

function currentMapKeyPrefix(mapId = state.currentMapId) {
    return `${mapId}:`;
}

function resetActiveEntitiesForMap(entities, mapId = state.currentMapId) {
    const prefix = currentMapKeyPrefix(mapId);
    state.selection.activeEntityKeys.forEach((key) => {
        if (key.startsWith(prefix)) state.selection.activeEntityKeys.delete(key);
    });
    entities.forEach((entity) => state.selection.activeEntityKeys.add(entityKey(entity, mapId)));
    state.selection.initializedActiveMapIds.add(mapId);
}

function isEntityActive(entity, mapId = state.currentMapId) {
    if (!state.selection.initializedActiveMapIds.has(mapId)) return true;
    if (entity.category === "monster" && state.alwaysShowBoss) return true;
    return state.selection.activeEntityKeys.has(entityKey(entity, mapId));
}

function isCaught(entity, mapId = state.currentMapId) {
    return state.selection.caughtEntityKeys.has(entityKey(entity, mapId));
}

function importUserStateFile(jsonText) {
    try {
        PersistedState.import(jsonText);
        refreshUiFromUserState();
        alert("가져오기가 완료되었습니다.");
    } catch (error) {
        alert(error instanceof Error ? error.message : "가져오기에 실패했습니다.");
    }
}

function showImportUserStateDialog() {
    importedTextContents.value = "";
    importedStateDialog.showModal();
}

function refreshUiFromUserState() {
    DetailPanel.closeDetail();
    applyViewMode();
    applyPickerState();
    applyFilterButtonState();
    EntityPanel.syncCaughtFilterAllButton();
    updateAlwaysShowBossButton();
    updateTodaySpotToggleButton();
    updateRealtimeTimeToggleButton();
    state.selection.activeMarkerKeys.clear();
    if (state.isTipsMode) {
        selectTipsPage();
    } else {
        renderMap();
    }
}

function toggleCaught(entity) {
    const key = entityKey(entity);
    if (state.selection.caughtEntityKeys.has(key)) {
        state.selection.caughtEntityKeys.delete(key);
    } else {
        state.selection.caughtEntityKeys.add(key);
    }
    saveAndRender(true);
}

function label(entity) {
    return entity.display && entity.display.trim() !== "" ? entity.display : entity.name;
}

function isMonsterRotationMap(mapId = state.currentMapId) {
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

function getMonsterRotationActiveIndex(entity, mapId = state.currentMapId) {
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

function shouldHideMarkerByRotation(entity, markerIndex, mapId = state.currentMapId) {
    const categoryKey = entity.category || "fish";
    const activeMonsterIndex = getMonsterRotationActiveIndex(entity, mapId);
    return categoryKey === "monster" &&
        isMonsterRotationMap(mapId) &&
        state.monsterRotationRevealed &&
        activeMonsterIndex !== null &&
        markerIndex !== activeMonsterIndex;
}

function isSeasonAvailable(entity) {
    if (!Array.isArray(entity.seasons) || entity.seasons.length !== 12) return true;
    return Boolean(entity.seasons[new Date().getMonth()]);
}

function hitFishTimeFilter(entity) {
    if (entity.timeBand === "day") return state.filters.time.has("day");
    if (entity.timeBand === "night") return state.filters.time.has("night");
    if (entity.timeBand === "both") return state.filters.time.has("both");
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
        const active = state.isTipsMode ? chip.dataset.mapId === TIPS_PAGE_ID : chip.dataset.mapId === state.currentMapId;
        chip.classList.toggle("active", active);
    });
}

function applyViewMode() {
    document.body.classList.toggle("tips-mode", state.isTipsMode);
    controlsSection.hidden = state.isTipsMode;
    mapLayout.hidden = state.isTipsMode;
    tipsLayout.hidden = !state.isTipsMode;
    if (state.isTipsMode && state.isMapFullscreen) exitMapFullscreen();
    updateTodaySpotToggleButton();
}

function syncMapFullscreenState(active) {
    state.isMapFullscreen = active;
    document.body.classList.toggle("map-fullscreen", active);
    mapLayout.classList.toggle("map-layout-fullscreen", active);
    controlsSection.classList.toggle("filter-fullscreen", active);
    fullscreenToggleBtn.classList.toggle("on", active);
    fullscreenToggleBtn?.setAttribute("aria-pressed", active ? "true" : "false");

    requestAnimationFrame(() => {
        state.mapInstance?.invalidateSize();
    });
    PersistedState.save();
}

function enterMapFullscreen() {
    if (state.isTipsMode) return;
    syncMapFullscreenState(true);
    fitCurrentMapBounds();
}

function exitMapFullscreen() {
    syncMapFullscreenState(false);
    fitCurrentMapBounds();
}

function toggleMapFullscreen() {
    if (state.isMapFullscreen) exitMapFullscreen();
    else enterMapFullscreen();
}

function handleViewportChange() {
    if (state.isMapFullscreen) syncMapFullscreenState(true);
    fitCurrentMapBounds();
}

window.addEventListener("resize", handleViewportChange);
window.addEventListener("orientationchange", () => {
    setTimeout(() => {
        state.mapInstance?.invalidateSize();
        fitCurrentMapBounds();
    }, 300);
});

function updateTodaySpotToggleButton() {
    if (!todaySpotToggleBtn) return;
    todaySpotToggleBtn.classList.toggle("on", state.monsterRotationRevealed);
    todaySpotToggleBtn.setAttribute("aria-pressed", state.monsterRotationRevealed ? "true" : "false");
}

function updateAlwaysShowBossButton() {
    if (!alwaysShowBossBtn) return;
    alwaysShowBossBtn.classList.toggle("on", state.alwaysShowBoss);
    alwaysShowBossBtn.setAttribute("aria-pressed", state.alwaysShowBoss ? "true" : "false");
}

function updateRealtimeTimeToggleButton() {

    const isDay = isRealtimeDayTime();
    realtimeTimeToggleBtn.textContent = isDay ? " 실시간 ☀️️" : "실시간 🌙"

    if (!realtimeTimeToggleBtn) return;
    realtimeTimeToggleBtn.classList.toggle("on", state.realtimeTimeFilterEnabled);
    realtimeTimeToggleBtn.setAttribute("aria-pressed", state.realtimeTimeFilterEnabled ? "true" : "false");
}

function applyFilterButtonState() {
    filterButtons.forEach((btn) => {
        const group = btn.dataset.group;
        const value = btn.dataset.value;
        btn.classList.toggle("active", state.filters[group].has(value));
    });
}

// 모바일에서 한 손가락 더블탭으로 확대, 두 손가락 더블탭으로 축소 기능을 구현합니다.
// iOS Safari의 경우 페이지 전체의 핀치/더블탭 줌이 방해될 수 있어,
//  map 영역 외에서는 300ms 이내의 터치가 발생하면 기본 동작을 막도록 했습니다.
//  map 영역에서는 별도의 로직으로 처리합니다.
function installSingleFingerDoubleTapZoomIn() {
    const el = state.mapInstance.getContainer();
    let lastTap = 0;
    el.addEventListener("touchstart", (event) => {
        // 한 손가락만
        if (event.touches.length !== 1) {
            return;
        }
        const now = Date.now();
        if (now - lastTap <= 300) {
            state.mapInstance.zoomIn();
            event.preventDefault();
            lastTap = 0;
            return;
        }
        lastTap = now;
    }, {passive: false});
}

function installTwoFingerDoubleTapZoomOut() {
    const el = state.mapInstance.getContainer();
    let lastTwoFingerTapAt = 0;
    el.addEventListener("touchstart", (event) => {
        if (event.touches.length !== 2) {
            return;
        }
        const now = Date.now();
        if (now - lastTwoFingerTapAt <= 300) {
            state.mapInstance.zoomOut();
            event.preventDefault();
            lastTwoFingerTapAt = 0;
            return;
        }
        lastTwoFingerTapAt = now;
    }, {passive: false});
}

function createMapIfNeeded() {
    if (state.mapInstance) return;
    state.mapInstance = L.map("map", {
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
    state.markerLayer = L.layerGroup().addTo(state.mapInstance);
    installSingleFingerDoubleTapZoomIn();
    installTwoFingerDoubleTapZoomOut();
}

async function loadMapEntities(mapId) {
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

function passesCurrentFilters(entity) {
    if (entity.category === "monster") {
        return state.alwaysShowBoss;
    }
    if (!state.filters.category.has(entity.category)) return false;
    if (!state.filters.rarity.has(entity.rarity)) return false;
    if (!hitFishTimeFilter(entity)) return false;
    const availableNow = isSeasonAvailable(entity);
    const availabilityKey = availableNow ? "available" : "unavailable";
    if (!state.filters.availability.has(availabilityKey)) return false;
    const mode = getGroupCaughtMode(entity.category);
    if (mode === "caught" && !isCaught(entity)) return false;
    return !(mode === "uncaught" && isCaught(entity));
}

function fitCurrentMapBounds() {
    if (!state.mapInstance) return;
    const mapInfo = mapsById[state.currentMapId];
    const bounds = [[0, 0], [mapInfo.imageHeight, mapInfo.imageWidth]];
    state.mapInstance.invalidateSize();
    requestAnimationFrame(() => {
        state.mapInstance.fitBounds(bounds, {
            padding: [0, 0],
            animate: false
        });
    });
}

function renderMap() {
    const mapInfo = mapsById[state.currentMapId];
    const bounds = [[0, 0], [mapInfo.imageHeight, mapInfo.imageWidth]];
    if (mapInfo.imageWidth && mapInfo.imageHeight) {
        mapLayout.style.setProperty("--active-map-aspect", mapInfo.imageWidth / mapInfo.imageHeight);
    }
    updateTodaySpotToggleButton();

    state.mapInstance.eachLayer((layer) => {
        if (layer instanceof L.ImageOverlay) state.mapInstance.removeLayer(layer);
    });

    L.imageOverlay(mapInfo.imagePath, bounds).addTo(state.mapInstance);
    fitCurrentMapBounds();

    // 여기서 부터 클릭 부분==================
    state.mapInstance.off("click");
    state.mapInstance.on("click", async (e) => {
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
        state.mapInstance.invalidateSize();
    });
    MarkerManager.scheduleRender();
}

function selectMap(mapId) {
    DetailPanel.closeDetail();
    if (!state.isTipsMode && state.currentMapId === mapId) {
        applyPickerState();
        return;
    }
    state.isTipsMode = false;
    state.currentMapId = mapId;
    applyViewMode();
    applyPickerState();
    PersistedState.save();
    renderMap();
}

function selectTipsPage() {
    DetailPanel.closeDetail();
    state.isTipsMode = true;
    applyViewMode();
    applyPickerState();
    PersistedState.save();
}

function isRealtimeDayTime() {
    const h = new Date().getHours();
    return h >= 4 && h < 20;
}

function shouldDimByRealtimeTime(entity) {
    if (!state.realtimeTimeFilterEnabled) return false;
    if (entity.timeBand === "both") return false;
    const isDay = isRealtimeDayTime();
    return (isDay && entity.timeBand === "night") ||
        (!isDay && entity.timeBand === "day");
}

function installPreventPageDoubleTapZoom() {
    let lastTouchEnd = 0;
    document.addEventListener("touchend", (event) => {
        // map 영역은 제외
        if (state.mapInstance?.getContainer()?.contains(event.target)) {
            return;
        }

        const now = Date.now();
        if (now - lastTouchEnd < 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, {passive: false});
}

function saveAndRender(refreshPanel = true) {
    PersistedState.save();
    MarkerManager.scheduleRender(refreshPanel);
}

document.addEventListener("DOMContentLoaded", () => {
    PersistedState.load();
    buildPicker();
    applyViewMode();
    applyPickerState();
    createMapIfNeeded();
    installPreventPageDoubleTapZoom();
    applyFilterButtonState();
    EntityPanel.init();
    DetailPanel.init();
    updateAlwaysShowBossButton();
    updateTodaySpotToggleButton();
    updateRealtimeTimeToggleButton();

    filterButtons.forEach((btn) => {
        const img = document.createElement("img");
        img.className = "filter-icon";
        img.src = `./assets/icons/filter/${btn.dataset.value}.svg`;
        const label = document.createElement("span");
        label.className = "filter-label";
        label.textContent = btn.textContent;
        btn.replaceChildren(img, label);

        btn.addEventListener("click", () => {
            const group = btn.dataset.group;
            const value = btn.dataset.value;
            const set = state.filters[group];
            if (set.has(value)) set.delete(value);
            else set.add(value);
            applyFilterButtonState();
            // state.resetActiveOnNextRender = true;
            saveAndRender();
        });
    });

    exportStateBtn?.addEventListener("click", PersistedState.export);
    importStateBtn?.addEventListener("click", () => showImportUserStateDialog());

    document.getElementById("btnImportCancel").addEventListener("click", () => {
        importedStateDialog.close();
    });

    document.getElementById("btnImportOk").addEventListener("click", () => {
        importUserStateFile(importedTextContents.value);
        importedStateDialog.close();
    });

    /*Tool Bar*/
    alwaysShowBossBtn?.addEventListener("click", () => {
        state.alwaysShowBoss = !state.alwaysShowBoss;
        PersistedState.save();
        updateAlwaysShowBossButton();
        MarkerManager.scheduleRender(false);
    });

    todaySpotToggleBtn?.addEventListener("click", () => {
        state.monsterRotationRevealed = !state.monsterRotationRevealed;
        PersistedState.save();
        updateTodaySpotToggleButton();
        MarkerManager.scheduleRender(false);
    });

    const isDay = isRealtimeDayTime();
    realtimeTimeToggleBtn.textContent = isDay ? " 실시간 ☀️️" : "실시간 🌙"
    realtimeTimeToggleBtn?.addEventListener("click", () => {
        state.realtimeTimeFilterEnabled = !state.realtimeTimeFilterEnabled;
        updateRealtimeTimeToggleButton();
        PersistedState.save();
        MarkerManager.scheduleRender(true);
    });

    fullscreenToggleBtn?.addEventListener("click", toggleMapFullscreen);
    /*Tool Bar*/
    document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        if (state.isMapFullscreen) {
            exitMapFullscreen();
        }
        if (DetailPanel.isPanelOpen()) {
            DetailPanel.closeDetail();
        }
    });

    mapPicker?.addEventListener('wheel', (event) => {
        if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
            // 기본 세로 스크롤 동작을 막습니다.
            event.preventDefault();
            // 휠을 위/아래로 굴릴 때 가로(왼쪽/오른쪽)로 스크롤되도록 설정합니다.
            // event.deltaY 값을 scrollLeft에 더해줌으로써 부드럽게 이동합니다.
            const horizontalDelta = event.deltaY;
            mapPicker.scrollLeft += horizontalDelta;
        }
    }, {passive: false}); // preventDefault()를 사용하기 위해 passive를 false로 설정합니다.

    if (state.isTipsMode) selectTipsPage();
    else {
        renderMap();
        if (state.isMapFullscreen) {
            requestAnimationFrame(() => {
                syncMapFullscreenState(true);
                fitCurrentMapBounds();
            });
        }
    }
});
