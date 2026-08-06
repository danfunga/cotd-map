import {state} from "../state/state.js";

class FullscreenManager {
    setDependencies(deps) {
        this.deps = deps;
    }

    init() {
        this.mapLayout = document.getElementById("mapLayout");
    }

    applyFullscreenState() {
        const active = state.isMapFullscreen;
        document.body.classList.toggle("map-fullscreen", active);
        this.mapLayout.classList.toggle("map-layout-fullscreen", active);
        this.deps.onFullscreenChanged();
    }

    setMapFullscreen(active) {
        if (state.isTipsMode && active) return;
        state.isMapFullscreen = active;
        this.applyFullscreenState();
        this.deps.fitCurrentMapBounds();
    }

    enterMapFullscreen() {
        this.setMapFullscreen(true);
    }

    exitMapFullscreen() {
        this.setMapFullscreen(false);
    }

    toggleMapFullscreen() {
        this.setMapFullscreen(!state.isMapFullscreen);
    }
    //
    // toggleMapFullscreen() {
    //     if (state.isMapFullscreen) this.exitMapFullscreen();
    //     else this.enterMapFullscreen();
    // }
    //
    // enterMapFullscreen() {
    //     if (state.isTipsMode) return;
    //     state.isMapFullscreen = true;
    //     this.syncMapFullscreenState();
    //     this.deps.fitCurrentMapBounds();
    // }
    //
    // exitMapFullscreen() {
    //     state.isMapFullscreen = false;
    //     this.syncMapFullscreenState();
    //     this.deps.fitCurrentMapBounds();
    // }
}

const fullscreenManager = new FullscreenManager();
export default fullscreenManager;