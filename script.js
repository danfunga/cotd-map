import { mapOrder, mapsById } from "./content/index.js";

const mapPicker = document.getElementById("mapPicker");
const timeCard = document.getElementById("timeCard");
const rarityCard = document.getElementById("rarityCard");
const filterButtons = document.querySelectorAll(".filter-btn[data-group]");
const clearButtons = document.querySelectorAll(".clear-btn[data-clear-group]");
const entityList = document.getElementById("entityList");
const showAllBtn = document.getElementById("showAllBtn");
const hideAllBtn = document.getElementById("hideAllBtn");
const panelToggleBtn = document.getElementById("panelToggleBtn");
const detailSheet = document.getElementById("detailSheet");
const detailBody = document.getElementById("detailBody");
const detailClose = document.getElementById("detailClose");
const detailBackdrop = document.getElementById("detailBackdrop");

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
let mapInstance = null;
let markerLayer = null;
let lastFilteredEntities = [];
const hiddenEntityIds = new Set();
const panelFoldState = {
  fish: true,
  creature: true,
  item: true
};

function label(entity) {
  return entity.display && entity.display.trim() !== "" ? entity.display : entity.name;
}

function markerIcon(entity, isPrimary = false) {
  const rarityKey = entity.rarity;
  const categoryKey = entity.category || "fish";

  // console.log(getImagePath(entity));
  return L.divIcon({
    className: "photo-marker-wrap",
    html: `
      <div class="marker-fallback-dot rarity-${rarityKey} category-${categoryKey}" ></div>
      <img class="photo-marker rarity-${rarityKey} ${isPrimary ? "primary-location" : ""}"
        src="${getImagePath(entity)}"
        alt="${label(entity)}"
        onerror="this.style.display='none';this.previousElementSibling.style.display='block';"
      >
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -16]
  });
}


function getImagePath(entity) {
  return `./assets/maps/${currentMapId}/portraits/${entity.category}/${entity.id}.png`;
}
function getFigureImage(entity) {
  return `./assets/maps/${currentMapId}/portraits/${entity.category}/figure/${entity.id}W.png`;
}

function availabilityTimeLabel(values) {
  if (!values || values.length === 0) return "종일";
  const map = { "day": "낮", "night": "밤", "both": "종일" };
  const labels = values.map((v) => map[v]).filter(Boolean);
  return labels.length ? labels.join(", ") : "종일";
}

function shadowSizeLabel(values) {
  if (!values || values.length === 0) return "없음";
  const map = { 0: "작음", 1: "보통", 2: "중형", 3: "대형" };
  const labels = values.map((v) => map[v]).filter(Boolean);
  return labels.length ? labels.join(", ") : "없음";
}

function shadowSpeedLabel(values) {
  if (!values || values.length === 0) return "없음";
  const map = { 0: "정지", 1: "보통", 2: "빠름" };
  const labels = values.map((v) => map[v]).filter(Boolean);
  return labels.length ? labels.join(", ") : "없음";
}

function isDayTimeNow() {
  const h = new Date().getHours();
  return h >= 6 && h < 18;
}

function isSeasonAvailable(entity) {
  if (!Array.isArray(entity.seasons) || entity.seasons.length !== 12) return true;
  return Boolean(entity.seasons[new Date().getMonth()]);
}

function isTimeAvailable(entity) {
  if (entity.timeBand === "both") return true;
  const dayNow = isDayTimeNow();
  if (entity.timeBand === "day") return dayNow;
  if (entity.timeBand === "night") return !dayNow;
  return true;
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
  if (d === null || d === undefined || d === 0) return { label: "없음", cls: "none" };
  if (d === 1) return { label: "고정", cls: "fixed" };
  if (d === 2) return { label: "움직임", cls: "moving" };
  return { label: "회전", cls: "rotate" };
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
}

function applyPickerState() {
  const chips = mapPicker.querySelectorAll(".map-chip");
  chips.forEach((chip) => chip.classList.toggle("active", chip.dataset.mapId === currentMapId));
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
  }, { passive: false });
}

function installTwoFingerDoubleTapZoomOut() {
  const el = mapInstance.getContainer();
  let lastTwoFingerTapAt =0;
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
  }, { passive: false });
}

function createMapIfNeeded() {
  if (mapInstance) return;
  mapInstance = L.map("map", {
    crs: L.CRS.Simple,
    minZoom: -3,
    maxZoom: 2,
    zoomSnap: 0.25,
    preferCanvas: true,
    zoomControl: false,
    zoomAnimation: false,
    fadeAnimation: false,
    doubleClickZoom: true
  });
  markerLayer = L.layerGroup().addTo(mapInstance);
  installSingleFingerDoubleTapZoomIn();
  installTwoFingerDoubleTapZoomOut();
}

function renderMarkers() {
  const mapInfo = mapsById[currentMapId];
  const entities = Array.isArray(mapInfo.entities) ? mapInfo.entities : [];
  markerLayer.clearLayers();

  const filtered = entities.filter((entity) => {
    if (entity.category === "monster" ){
        if (!filters.category.has("fish")) {
            return false;
        }
        if (!filters.rarity.has("epic")) {
            return false;
        }
    } else {
        if (!filters.category.has(entity.category)) {
            return false;
        }
        if (!filters.rarity.has(entity.rarity)) {
            return false;
        }
    }

    if (entity.category === "fish" && !hitFishTimeFilter(entity)) return false;

    const availableNow = isSeasonAvailable(entity);
    const availabilityKey = availableNow ? "available" : "unavailable";
    return filters.availability.has(availabilityKey);
  });

  lastFilteredEntities = filtered;
  renderEntityPanel();

  filtered.forEach((entity) => {
    if (hiddenEntityIds.has(entity.id)) return;
    const locs = Array.isArray(entity.locations) ? entity.locations : [];
    if (locs.length === 0) return;

    const mini = minigameMeta(entity);
    const miniHtml = mini
      ? `<p><strong>미니게임:</strong> <span class="minigame-pill minigame-${mini.cls}">${mini.label}</span></p>`
      : "";
    const latinHtml = `<div class="detail-wide-row"><strong>학명:</strong> ${entity.latin || "-"}</div>`;
    const seasonHtml = seasonBar(entity);
    const noteHtml = entity.notes && entity.notes.trim() !== ""
      ? `<div class="detail-note"><strong>메모:</strong> ${entity.notes}</div>`
      : "";

    const detailHtml = `
      <div class="fish-popup detail-theme">
        <div class="detail-title-row">
            <h3>${label(entity)}</h3>
            ${entity.name}
            <button class="detail-close-inline" type="button" aria-label="닫기"> 닫기 </button>
        </div>
              
        <div class="detail-layout">
          <div class="detail-info">
            <p><strong>분류:</strong> ${entity.category}</p>
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

    locs.forEach((l, idx) => {
      L.marker([l.y, l.x], { icon: markerIcon(entity, idx === 0) })
        .on("click", () => openDetail(detailHtml))
        .addTo(markerLayer);
    });
  });
}

function renderEntityPanel() {
  entityList.innerHTML = "";
  const categoryRank = { fish: 0, creature: 1, item: 2 };
  const categoryLabel = { fish: "물고기", creature: "생명체", item: "아이템" };
  const rarityRank = { common: 0, rare: 1, epic: 2, monster: 3 };
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
    fish: sorted.filter((e) => e.category === "fish"|| e.category === "monster"),
    creature: sorted.filter((e) => e.category === "creature"),
    item: sorted.filter((e) => e.category === "item")
  };

  ["fish", "creature", "item"].forEach((category) => {
    const groupItems = grouped[category];
    if (groupItems.length === 0) return;

    const section = document.createElement("section");
    section.className = "entity-group";

    const header = document.createElement("button");
    header.type = "button";
    header.className = "entity-group-head";
    header.innerHTML = `
        <span>${categoryLabel[category]}</span>
        <button type="button" class="group-toggle-btn" data-category="${category}"> </button>
        <span class="entity-group-meta">${groupItems.length}</span>
        <span class="entity-group-arrow">${panelFoldState[category] ? "▾" : "▸"} </span>
    `;
    const toggleBtn = header.querySelector(".group-toggle-btn");
    const allHidden = groupItems.every((e) =>
        hiddenEntityIds.has(e.id)
    );
    toggleBtn.textContent = allHidden ? "X" : "O";
    toggleBtn.style.color = allHidden ? "#e6e2e2":"#ffd24f";
    header.addEventListener("click", () => {
      panelFoldState[category] = !panelFoldState[category];
      renderEntityPanel();
    });
    section.appendChild(header);

    const body = document.createElement("div");
    body.className = `entity-group-body ${panelFoldState[category] ? "open" : "closed"}`;

    groupItems.forEach((entity) => {
      const row = document.createElement("button");
      row.type = "button";
      const rarityKey = entity.isMonster ? "monster" : entity.rarity;
      row.className = `entity-row rarity-${rarityKey} ${hiddenEntityIds.has(entity.id) ? "off" : ""}`;
      const count = Array.isArray(entity.locations) ? entity.locations.length : 0;
      row.innerHTML = `
          <span class="entity-left">
              <img class="entity-thumb" src="${getImagePath(entity)}" alt="${label(entity)}" onerror="this.style.display='none';">
              <span class="entity-texts">
                <span class="entity-name rarity-${rarityKey}"> ${label(entity)} </span>
                <span class="entity-sub-name"> ${entity.name} </span>
              </span>              
          </span>
          <span class="entity-count">${count}</span>
        `;
      row.addEventListener("click", () => {
        if (hiddenEntityIds.has(entity.id)) {
          hiddenEntityIds.delete(entity.id);
        }
        else hiddenEntityIds.add(entity.id);
        {
          renderMarkers();
        }
      });
      body.appendChild(row);
    });

    section.appendChild(body);
    entityList.appendChild(section);

    // 그룹 전체 토글 버튼 이벤트
    header.querySelector(".group-toggle-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      const group = grouped[category];
      const allHidden = group.every((e) => hiddenEntityIds.has(e.id));
      group.forEach((e) => {
        if (allHidden) {
          hiddenEntityIds.delete(e.id); // 전체 표시
        } else {
          hiddenEntityIds.add(e.id); // 전체 숨김
        }
      });
      renderMarkers();
      renderEntityPanel();
    });
  });
}

function openDetail(html) {
  detailBody.innerHTML = html;
  detailSheet.classList.add("open");
  detailSheet.setAttribute("aria-hidden", "false");
}

function closeDetail() {
  detailSheet.classList.remove("open");
  detailSheet.setAttribute("aria-hidden", "true");
}

function toggleEntityPanel() {
  const isMobile = window.matchMedia("(max-width: 860px)").matches;
  if (!isMobile) return;
  const panel = document.getElementById("entityPanel");
  const nextOpen = !panel.classList.contains("open");
  panel.classList.toggle("open", nextOpen);
  panelToggleBtn.textContent = nextOpen ? "목록 닫기" : "목록 열기";
}

function renderMap() {
  const mapInfo = mapsById[currentMapId];
  const bounds = [[0, 0], [mapInfo.imageHeight, mapInfo.imageWidth]];

  mapInstance.eachLayer((layer) => {
    if (!(layer instanceof L.TileLayer) && layer !== markerLayer) mapInstance.removeLayer(layer);
  });

  L.imageOverlay(mapInfo.imagePath, bounds).addTo(mapInstance);
  mapInstance.fitBounds(bounds, {
    padding: [0, 0],
    animate: false
  });

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

  renderMarkers();
}

function selectMap(mapId) {
  closeDetail();
  currentMapId = mapId;
  applyPickerState();
  renderMap();
}

function resetFilters() {
  filters.category = new Set(defaults.category);
  filters.time = new Set(defaults.time);
  filters.rarity = new Set(defaults.rarity);
  filters.availability = new Set(defaults.availability);
  hiddenEntityIds.clear();
  applyFilterButtonState();
  applyFishOnlyState();
  renderMarkers();
}

function clearFilterGroup(group) {
  if (filters[group].size > 0) {
    filters[group].clear();
  } else {
    filters[group] = new Set(defaults[group]);
  }
  applyFilterButtonState();
  applyFishOnlyState();
  renderMarkers();
}

document.addEventListener("DOMContentLoaded", () => {
  buildPicker();
  applyPickerState();
  createMapIfNeeded();
  applyFilterButtonState();
  applyFishOnlyState();

  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const group = btn.dataset.group;
      const value = btn.dataset.value;
      const set = filters[group];
      if (set.has(value)) set.delete(value);
      else set.add(value);
      applyFilterButtonState();
      applyFishOnlyState();
      renderMarkers();
    });
  });

  clearButtons.forEach((btn) => {
    btn.addEventListener("click", () => clearFilterGroup(btn.dataset.clearGroup));
  });
  showAllBtn.addEventListener("click", () => {
    hiddenEntityIds.clear();
    renderMarkers();
  });
  hideAllBtn.addEventListener("click", () => {
    lastFilteredEntities.forEach((e) => hiddenEntityIds.add(e.id));
    renderMarkers();
  });
  panelToggleBtn.addEventListener("click", toggleEntityPanel);
  detailClose.addEventListener("click", closeDetail);
  detailBackdrop.addEventListener("click", closeDetail);
  detailBody.addEventListener("click", (event) => {
    if (event.target.classList.contains("detail-close-inline")) closeDetail();
  });
  renderMap();
});
