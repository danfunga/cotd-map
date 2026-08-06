import {state} from "../state/state.js";
import PersistedState from "../state/persistedState.js";
import {isRealtimeDayTime} from "../util/timeUtil.js"

class MapToolbar {
    setDependencies(deps) {
        this.deps = deps;
    }

    init() {
        this.alwaysShowBossBtn = document.getElementById("alwaysShowBossBtn");
        this.todaySpotToggleBtn = document.getElementById("todaySpotToggleBtn");
        this.realtimeTimeToggleBtn = document.getElementById("realtimeTimeToggleBtn");
        this.fullscreenToggleBtn = document.getElementById("fullscreenToggleBtn");
        this.registerEvents();
        this.updateAllButtons();
    }

    registerEvents() {
        this.alwaysShowBossBtn?.addEventListener("click", () => {
            state.alwaysShowBoss = !state.alwaysShowBoss;
            PersistedState.save();
            this.updateAlwaysShowBossButton();
            this.deps.scheduleRender(false);
        });
        this.todaySpotToggleBtn?.addEventListener("click", () => {
            state.monsterRotationRevealed = !state.monsterRotationRevealed;
            PersistedState.save();
            this.updateTodaySpotToggleButton();
            this.deps.scheduleRender(false);
        });
        this.realtimeTimeToggleBtn?.addEventListener("click", () => {
            state.realtimeTimeFilterEnabled = !state.realtimeTimeFilterEnabled;
            this.updateRealtimeTimeToggleButton();
            PersistedState.save();
            this.deps.scheduleRender(true);
        });
        this.fullscreenToggleBtn?.addEventListener("click", () => {
            this.deps.toggleMapFullscreen();
        });
    }

    updateAllButtons() {
        this.updateAlwaysShowBossButton()
        this.updateRealtimeTimeToggleButton()
        this.updateTodaySpotToggleButton()
    }

    updateTodaySpotToggleButton() {
        if (!this.todaySpotToggleBtn) return;
        this.todaySpotToggleBtn.classList.toggle("on", state.monsterRotationRevealed);
        this.todaySpotToggleBtn.setAttribute("aria-pressed", state.monsterRotationRevealed ? "true" : "false");
    }

    updateAlwaysShowBossButton() {
        if (!this.alwaysShowBossBtn) return;
        this.alwaysShowBossBtn.classList.toggle("on", state.alwaysShowBoss);
        this.alwaysShowBossBtn.setAttribute("aria-pressed", state.alwaysShowBoss ? "true" : "false");
    }

    updateRealtimeTimeToggleButton() {
        if (!this.realtimeTimeToggleBtn) return;
        const isDay = isRealtimeDayTime();
        this.realtimeTimeToggleBtn.textContent = isDay ? " 실시간 ☀️️" : "실시간 🌙"
        this.realtimeTimeToggleBtn.classList.toggle("on", state.realtimeTimeFilterEnabled);
        this.realtimeTimeToggleBtn.setAttribute("aria-pressed", state.realtimeTimeFilterEnabled ? "true" : "false");
    }

    updateFullscreenToggleButton() {
        if (!this.fullscreenToggleBtn) return;
        const active = state.isMapFullscreen;
        this.fullscreenToggleBtn.classList.toggle("on", active);
        this.fullscreenToggleBtn?.setAttribute("aria-pressed", active ? "true" : "false");
    }
}

const mapToolbar = new MapToolbar();
export default mapToolbar;