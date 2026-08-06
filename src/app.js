// data
import {mapOrder, mapsById} from "../content/mapIndex.js";
// state
import {state} from "./state/state.js";
import PersistedState from "./state/persistedState.js";
// constants
// repository
// ui
import {showToast} from "./ui/toast.js";
//map
import MarkerManager from "./manager/markerManager.js";
import EntityManager from "./manager/entityManager.js";
import FullscreenManager from "./manager/fullscreenManager.js";
import EntityPanel from "./ui/entityPanel.js";
import DetailPanel from "./ui/detailPanel.js";
import StateImportExport from "./ui/stateImportExport.js";
import MapToolbar from "./ui/mapToolbar.js";
import MapPicker from "./ui/mapPicker.js";
import FilterPanel from "./ui/filterPanel.js";

MarkerManager.setDependencies({
    renderEntityPanel: (...args) => EntityPanel.render(...args),
    entityManager: EntityManager,
    openEntityDetail: (...args) => {
        DetailPanel.openEntityDetail(...args)
    },
});
EntityPanel.setDependencies({
    entityManager: EntityManager,
    openEntityDetail: (...args) => {
        DetailPanel.openEntityDetail(...args)
    },
    saveAndRender
});
DetailPanel.setDependencies({
    entityManager: EntityManager,
});
EntityManager.setDependencies({
    saveAndRender
});
StateImportExport.setDependencies({
    refreshUI
});
MapToolbar.setDependencies({
    toggleMapFullscreen: FullscreenManager.toggleMapFullscreen.bind(FullscreenManager),
    scheduleRender: (arg) => {
        MarkerManager.scheduleRender(arg);
    }
});
MapPicker.setDependencies({
    applyViewMode,
    renderMap,
    selectTipsPage
});
FilterPanel.setDependencies({
    saveAndRender
});
FullscreenManager.setDependencies({
    fitCurrentMapBounds,
    onFullscreenChanged: () => {
        MapPicker.updateState();
        FilterPanel.updateState();
        MapToolbar.updateFullscreenToggleButton();
        requestAnimationFrame(() => {
            state.mapInstance?.invalidateSize();
        });
        PersistedState.save();
    }
});
const mapLayout = document.getElementById("mapLayout");
const tipsLayout = document.getElementById("tipsLayout");
state.currentMapId = mapOrder[0];

function refreshUI() {
    DetailPanel.closeDetail();
    applyViewMode();
    MapPicker.updateState();
    // FilterPanel.updateState();
    EntityPanel.syncCaughtFilterAllButton();
    MapToolbar.updateAllButtons();
    state.selection.activeMarkerKeys.clear();
    if (state.isTipsMode) {
        selectTipsPage();
    } else {
        renderMap();
    }
}

function applyViewMode() {
    document.body.classList.toggle("tips-mode", state.isTipsMode);
    mapLayout.hidden = state.isTipsMode;
    tipsLayout.hidden = !state.isTipsMode;
    FilterPanel.updateState();
    MapToolbar.updateTodaySpotToggleButton();
}

function handleViewportChange() {
    if (state.isMapFullscreen) {
        FullscreenManager.applyFullscreenState();
    }
    fitCurrentMapBounds();
}

window.addEventListener("resize", handleViewportChange);
window.addEventListener("orientationchange", () => {
    setTimeout(() => {
        state.mapInstance?.invalidateSize();
        fitCurrentMapBounds();
    }, 300);
});
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
    MapToolbar.updateTodaySpotToggleButton();
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

function selectTipsPage() {
    state.isTipsMode = true;
    DetailPanel.closeDetail();
    FullscreenManager.applyFullscreenState();
    applyViewMode();
}

document.addEventListener("DOMContentLoaded", () => {
    PersistedState.load();
    MapPicker.init();
    EntityManager.init();
    StateImportExport.init();
    MapToolbar.init();
    FilterPanel.init();
    FullscreenManager.init();
    applyViewMode();
    createMapIfNeeded();
    installPreventPageDoubleTapZoom();
    EntityPanel.init();
    DetailPanel.init();

    document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        if (state.isMapFullscreen) {
            FullscreenManager.exitMapFullscreen();
        }
        if (DetailPanel.isPanelOpen()) {
            DetailPanel.closeDetail();
        }
    });
    if (state.isTipsMode) {
        selectTipsPage();
    } else {
        renderMap();
        if (state.isMapFullscreen) {
            requestAnimationFrame(() => {
                FullscreenManager.applyFullscreenState();
            });
        }
    }
});
