// data
import {mapOrder} from "../content/mapIndex.js";
// state
import {state} from "./state/state.js";
import PersistedState from "./state/persistedState.js";
// constants
// repository
// ui
//map
import MarkerManager from "./manager/markerManager.js";
import EntityManager from "./manager/entityManager.js";
import MapManager from "./manager/MapManager.js";
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
    renderMap: MapManager.renderMap.bind(MapManager)
});
FilterPanel.setDependencies({
    saveAndRender
});
FullscreenManager.setDependencies({
    fitCurrentMapBounds: MapManager.fitCurrentMapBounds.bind(MapManager),
    onFullscreenChanged: () => {
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
    EntityPanel.syncCaughtFilterAllButton();
    MapToolbar.updateAllButtons();
    state.selection.activeMarkerKeys.clear();
    MapManager.renderMap();
}

function applyViewMode() {
    document.body.classList.toggle("tips-mode", state.isTipsMode);
    mapLayout.hidden = state.isTipsMode;
    tipsLayout.hidden = !state.isTipsMode;
    FilterPanel.updateState();
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
    MapPicker.init();
    EntityManager.init();
    StateImportExport.init();
    MapToolbar.init();
    FilterPanel.init();
    MapManager.init();
    FullscreenManager.init();
    EntityPanel.init();
    DetailPanel.init();
    applyViewMode();
    installPreventPageDoubleTapZoom();
});
