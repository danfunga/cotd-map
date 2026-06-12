import {mapOrder, mapsById} from './content/index.js';

const mapPicker = document.getElementById("mapPicker");
const timeCard = document.getElementById("timeCard");
const rarityCard = document.getElementById("rarityCard");
const filterButtons = document.querySelectorAll(".filter-btn[data-group]");
const clearButtons = document.querySelectorAll(".clear-btn[data-clear-group]");
const entityList = document.getElementById("entityList");
const showAllBtn = document.getElementById("showAllBtn");
const hideAllBtn = document.getElementById("hideAllBtn");
const caughtFilterAllBtn = document.getElementById("caughtFilterAllBtn");
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
let currentDetailEntity = null;
const hiddenEntityIds = new Set();
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
    if (mode === "all") return "caught";
    if (mode === "caught") return "uncaught";
    return "all";
}

function caughtModeLabel(mode) {
    if (mode === "caught") return "잡음";
    if (mode === "uncaught") return "미획득";
    return "전체";
}

function getGroupCaughtMode(category) {
    return category === "monster" ? caughtFilterMode.fish : (caughtFilterMode[category] || "all");
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

function isCaught(entity, mapId = currentMapId) {
    return caughtEntityKeys.has(entityKey(entity, mapId));
}

function saveUserState() {
    const payload = {
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
        caught: [...caughtEntityKeys],
        caughtFilterMode: {...caughtFilterMode},
        hiddenEntityIds: [...hiddenEntityIds]
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function loadUserState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);
        if (mapOrder.includes(data.mapId)) currentMapId = data.mapId;
        isTipsMode = Boolean(data.isTipsMode);
        isMapFullscreen = Boolean(data.isMapFullscreen);
        monsterRotationRevealed = Boolean(data.monsterRotationRevealed);
        alwaysShowBoss = Boolean(data.alwaysShowBoss);
        realtimeTimeFilterEnabled = Boolean(data.realtimeTimeFilterEnabled);

        if (data.filters && typeof data.filters === "object") {
            for (const group of ["category", "time", "rarity", "availability"]) {
                const values = Array.isArray(data.filters[group]) ? data.filters[group] : null;
                if (values) filters[group] = new Set(values);
            }
        }
        if (Array.isArray(data.caught)) {
            data.caught.forEach((key) => {
                if (typeof key === "string") caughtEntityKeys.add(key);
            });
        }
        if (Array.isArray(data.hiddenEntityIds)) {
            data.hiddenEntityIds.forEach((id) => {
                if (typeof id === "string") hiddenEntityIds.add(id);
            });
        }
        if (data.caughtFilterMode && typeof data.caughtFilterMode === "object") {
            for (const category of ["fish", "creature", "item"]) {
                const mode = data.caughtFilterMode[category];
                if (mode === "all" || mode === "caught" || mode === "uncaught") {
                    caughtFilterMode[category] = mode;
                }
            }
        }
    } catch {
        // Ignore invalid local state
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

function markerIcon(entity, isPrimary = false, markerIndex = 0) {
    const rarityKey = entity.rarity;
    const categoryKey = entity.category || "fish";
    const caught = isCaught(entity);
    const caughtClass = caught ? "caught" : "";
    const markerNumber = categoryKey === "monster" ? (markerIndex + 1) : null;
    if (categoryKey === "monster") {
        isPrimary = false;
    }
    const activeMonsterIndex = getMonsterRotationActiveIndex(entity);
    const shouldDimByRotation =
        categoryKey === "monster" &&
        isMonsterRotationMap() &&
        monsterRotationRevealed &&
        activeMonsterIndex !== null &&
        markerIndex !== activeMonsterIndex;
    const rotationDimClass = shouldDimByRotation ? "rotation-dim" : "";
    const timeDimClass = shouldDimByRealtimeTime(entity) ? "time-dim" : "";
    // console.log(getImagePath(entity));
    return L.divIcon({
        className: "photo-marker-wrap",
        html: `
      <div class="marker-fallback-dot rarity-${rarityKey} category-${categoryKey}" ></div>
      <img class="photo-marker rarity-${rarityKey} ${rotationDimClass} ${timeDimClass} ${isPrimary ? "primary-location" : ""} ${caughtClass}"
        src="${getImagePath(entity)}"
        alt="${label(entity)}"
        onerror="this.style.display='none';this.previousElementSibling.style.display='block';"
      >
      ${markerNumber ? `<span class="marker-number ${rotationDimClass} ${timeDimClass}">${markerNumber}</span>` : ""}
      ${caught ? `<span class="caught-v marker-v ${rotationDimClass} ${timeDimClass}">✓</span>` : ""}
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
        const marker = L.marker([l.y, l.x], {icon: markerIcon(entity, idx === 0, idx)});
        marker.on("click", () => openEntityDetail(entity));
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

function refreshMonsterMarkers() {
    const entities = lastFilteredEntities.filter(
        (entity) => entity.category === "monster"
    );
    entities.forEach((entity) => {
        const bundle = getMarkerBundle(currentMapId, entity);
        updateMarkerBundleIcons(bundle, entity);
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
    if (entity.seasons.every((v) => v === true)) return "";
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
        button.innerHTML = `<img src="${mapInfo.imagePath}" alt="${mapInfo.name}"><span>${mapInfo.name}</span>`;
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
}

window.addEventListener("resize", handleViewportChange);

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

function applyFishOnlyState() {
    const hasFish = filters.category.has("fish");
    timeCard.classList.toggle("disabled", !hasFish);
    rarityCard.classList.remove("disabled");
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

function buildDetailHtml(entity) {
    const mini = minigameMeta(entity);
    const miniHtml = mini
        ? `<p><strong>미니게임:</strong> <span class="minigame-pill minigame-${mini.cls}">${mini.label}</span></p>`
        : "";
    const latinHtml = `<div class="detail-wide-row"><strong>학명:</strong> ${entity.latin || "-"}</div>`;
    const seasonHtml = seasonBar(entity);
    const noteHtml = entity.notes && entity.notes.trim() !== ""
        ? `<div class="detail-note"><strong>메모:</strong> ${entity.notes}</div>`
        : "";

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
        </div>
      </div>`;
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
    const entities = responses.flat();
    mapEntitiesCache.set(mapId, entities);
    return entities;
}

function passesCurrentFilters(entity) {
    if (entity.category === "monster") {
        return alwaysShowBoss;
    }
    //   if( alwaysShowBoss ) return true;
    //   if (!filters.category.has("fish")) return false;
    //   if (!filters.rarity.has("epic")) return false;
    // } else {
    if (!filters.category.has(entity.category)) return false;
    if (!filters.rarity.has(entity.rarity)) return false;
    // }
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
    const entities = await loadMapEntities(currentMapId);
    if (requestId !== renderRequestId || mapInfo.id !== currentMapId) return;

    const filtered = entities.filter((entity) => passesCurrentFilters(entity));

    lastFilteredEntities = filtered;
    if (refreshPanel) renderEntityPanel();

    const nextActiveKeys = new Set();
    filtered.forEach((entity) => {

        if (hiddenEntityIds.has(entity.id)) {
            return;
        }
        const locs = Array.isArray(entity.locations) ? entity.locations : [];
        if (locs.length === 0) return;
        const bundle = getMarkerBundle(currentMapId, entity);
        updateMarkerBundleIcons(bundle, entity);
        nextActiveKeys.add(bundle.key);
        if (!activeMarkerKeys.has(bundle.key)) {
            bundle.markers.forEach((marker) => markerLayer.addLayer(marker));
        }
    });

    activeMarkerKeys.forEach((key) => {
        if (nextActiveKeys.has(key)) return;
        const byMap = markerBundleCache.get(currentMapId);
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

    const grouped = {
        // fish: sorted.filter((e) => e.category === "fish" || e.category === "monster"),
        fish: sorted.filter((e) => e.category === "fish"),
        creature: sorted.filter((e) => e.category === "creature"),
        item: sorted.filter((e) => e.category === "item")
    };
    const visibleCategories = ["fish", "creature", "item"].filter((category) => filters.category.has(category));

    const sections = visibleCategories.map((category) => {
        const groupItems = grouped[category];
        const ui = getOrCreateGroupUi(category, categoryLabel[category]);
        const allHidden = groupItems.length > 0 && groupItems.every((e) => hiddenEntityIds.has(e.id));
        ui.toggleBtn.textContent = allHidden ? "X" : "O";
        ui.toggleBtn.style.color = allHidden ? "#e6e2e2" : "#ffd24f";
        ui.caughtFilterBtn.textContent = caughtModeLabel(caughtFilterMode[category]);
        ui.metaEl.textContent = String(groupItems.length);
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
      <button type="button" class="group-toggle-btn" data-category="${category}"></button>
      <button type="button" class="caught-filter-btn" data-category="${category}"></button>
      <span class="entity-group-meta"></span>
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
        toggleBtn: header.querySelector(".group-toggle-btn"),
        caughtFilterBtn: header.querySelector(".caught-filter-btn"),
        metaEl: header.querySelector(".entity-group-meta"),
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

        const allHidden = group.length > 0 && group.every((ent) => hiddenEntityIds.has(ent.id));
        group.forEach((ent) => {
            if (allHidden) hiddenEntityIds.delete(ent.id);
            else hiddenEntityIds.add(ent.id);
        });
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
        <span class="entity-wrong-time-badge">X</span>
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
        wrongTimeBadge: row.querySelector(".entity-wrong-time-badge"),
        nameEl: row.querySelector(".entity-name"),
        subNameEl: row.querySelector(".entity-sub-name"),
        countEl: row.querySelector(".entity-count"),
        countVEl: row.querySelector(".count-v")
    };

    row.addEventListener("click", () => {
        if (hiddenEntityIds.has(entity.id)) hiddenEntityIds.delete(entity.id);
        else hiddenEntityIds.add(entity.id);
        updateEntityRow(rowUi, entity);
        const categoryKey = entity.category === "monster" ? "fish" : entity.category;
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
    rowUi.row.className = `entity-row rarity-${rarityKey} ${hiddenEntityIds.has(entity.id) ? "off" : ""} ${isCaught(entity) ? "caught" : ""}`;
    const count = Array.isArray(entity.locations) ? entity.locations.length : 0;
    rowUi.countEl.textContent = String(count);
    rowUi.countVEl.className = `caught-v count-v ${isCaught(entity) ? "on" : "off"}`;
    rowUi.nameEl.className = `entity-name rarity-${rarityKey}`;
    rowUi.nameEl.textContent = label(entity);
    rowUi.subNameEl.textContent = entity.name || "";
    rowUi.thumb.src = getImagePath(entity);
    rowUi.thumb.alt = label(entity);
    rowUi.thumb.onerror = function onThumbError() {
        this.style.display = "none";
    };
    const dimmed = shouldDimByRealtimeTime(entity);
    rowUi.thumb.style.display = "";
    rowUi.thumb.classList.toggle("time-dim", dimmed);

    rowUi.wrongTimeBadge.style.display = dimmed ? "block" : "none";
    if (dimmed) {
        rowUi.wrongTimeBadge.textContent = entity.timeBand === "night" ? "🌙" : "🔆";
    }
}

function updateGroupHeaderState(category) {
    const ui = groupUiCache.get(category);
    if (!ui) return;
    const group = lastFilteredEntities.filter((ent) => ent.category === category);
    const allHidden = group.length > 0 && group.every((ent) => hiddenEntityIds.has(ent.id));
    ui.toggleBtn.textContent = allHidden ? "X" : "O";
    ui.toggleBtn.style.color = allHidden ? "#e6e2e2" : "#ffd24f";
}

function openDetail(html) {
    detailBody.innerHTML = html;
    detailSheet.classList.add("open");
    detailSheet.setAttribute("aria-hidden", "false");
}

function openEntityDetail(entity) {
    currentDetailEntity = entity;
    openDetail(buildDetailHtml(entity));
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
        if (!(layer instanceof L.TileLayer) && layer !== markerLayer) mapInstance.removeLayer(layer);
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
        const text = `"x": ${point.x}, "y": ${point.y}`;
        console.log(text);
    });
    // 클릭 끝 ==================

    requestAnimationFrame(() => {
        mapInstance.invalidateSize();
    });

    activeMarkerKeys.clear();
    scheduleRenderMarkers();
}

function selectMap(mapId) {
    closeDetail();
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
    applyFishOnlyState();
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
    applyFishOnlyState();
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
            applyFishOnlyState();
            saveUserState();
            scheduleRenderMarkers();
        });
    });

    clearButtons.forEach((btn) => {
        btn.addEventListener("click", () => clearFilterGroup(btn.dataset.clearGroup));
    });
    showAllBtn.addEventListener("click", () => {
        hiddenEntityIds.clear();
        saveUserState();
        scheduleRenderMarkers();
    });
    hideAllBtn.addEventListener("click", () => {
        lastFilteredEntities.forEach((e) => {
            if (e.category !== "monster") {
                hiddenEntityIds.add(e.id);
            }
        });
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
        refreshMonsterMarkers();
    });

    panelToggleBtn.addEventListener("click", toggleEntityPanel);

    realtimeTimeToggleBtn?.addEventListener("click", () => {
        realtimeTimeFilterEnabled = !realtimeTimeFilterEnabled;
        saveUserState();
        updateRealtimeTimeToggleButton();
        scheduleRenderMarkers(true);
    });

    fullscreenToggleBtn?.addEventListener("click", toggleMapFullscreen);
    /*Tool Bar*/

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
