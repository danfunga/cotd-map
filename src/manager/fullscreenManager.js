import {state} from "../state/state.js";

class FullscreenManager {
    setDependencies(deps) {
        this.deps = deps;
    }

    init() {
        this.mapLayout = document.getElementById("mapLayout");
        this.registerEvents();
        if (state.isMapFullscreen) {
            requestAnimationFrame(() => {
                this.applyFullscreenState();
            });
        }
    }

    registerEvents() {
        document.addEventListener("keydown", (event) => {
            if (event.key !== "Escape" || !state.isMapFullscreen) return;
            this.exitMapFullscreen();
            event.preventDefault();
        });
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
}

const fullscreenManager = new FullscreenManager();
export default fullscreenManager;