// state
import PersistedState from "./state/persistedState.js";
//map
import MarkerManager from "./manager/markerManager.js";
import EntityManager from "./manager/entityManager.js";
import MapManager from "./manager/mapManager.js";
import FullscreenManager from "./manager/fullscreenManager.js";
// ui
import EntityPanel from "./ui/entityPanel.js";
import DetailPanel from "./ui/detailPanel.js";
import StateImportExport from "./ui/stateImportExport.js";
import MapToolbar from "./ui/mapToolbar.js";
import MapPicker from "./ui/mapPicker.js";
import FilterPanel from "./ui/filterPanel.js";

MarkerManager.setDependencies({
    renderEntityPanel: EntityPanel.render.bind(EntityPanel),
    entityManager: EntityManager,
    openEntityDetail: DetailPanel.openEntityDetail.bind(DetailPanel)
});
EntityPanel.setDependencies({
    entityManager: EntityManager,
    openEntityDetail: DetailPanel.openEntityDetail.bind(DetailPanel),
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
    scheduleRender: MarkerManager.scheduleRender.bind(MarkerManager)
});

MapPicker.setDependencies({
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
    }
});
MapManager.setDependencies({
    filterStateUpdate: FilterPanel.updateState.bind(FilterPanel)
});

function refreshUI() {
    EntityPanel.syncCaughtFilterAllButton();
    MarkerManager.clearSelection();
    MapManager.renderMap();
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
    // detail ESC가 먼저 실행 되도록.
    DetailPanel.init();
    FullscreenManager.init();
    EntityPanel.init();
    MapManager.init();
});
