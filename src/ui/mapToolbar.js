import {state} from "../state/state.js";
import {isRealtimeDayTime} from "../util/timeUtil.js"

class MapToolbar {
    setDependencies(deps) {
        this.deps = deps;
    }

    init() {
        this.showMonsterToggleButton = document.getElementById("showMonsterButton");
        this.monsterTodaySpotToggleButton = document.getElementById("monsterTodaySpotButton");
        this.realtimeTimeToggleBtn = document.getElementById("realtimeTimeToggleBtn");
        this.fullscreenToggleBtn = document.getElementById("fullscreenToggleBtn");
        this.lastRealtimeIsDay = isRealtimeDayTime();
        this.registerEvents();
        this.updateAllButtons();
    }

    registerEvents() {
        this.showMonsterToggleButton?.addEventListener("click", () => {
            state.alwaysShowBoss = !state.alwaysShowBoss;
            this.updateAlwaysShowBossButton();
            this.deps.saveAndRender(false);
        });
        this.monsterTodaySpotToggleButton?.addEventListener("click", () => {
            state.monsterRotationRevealed = !state.monsterRotationRevealed;
            this.updateTodaySpotToggleButton();
            this.deps.saveAndRender(false);
        });
        this.realtimeTimeToggleBtn?.addEventListener("click", () => {
            state.realtimeTimeFilterEnabled = !state.realtimeTimeFilterEnabled;
            this.updateRealtimeTimeToggleButton(false);
            this.deps.saveAndRender(true);
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
        if (!this.monsterTodaySpotToggleButton) return;
        this.monsterTodaySpotToggleButton.classList.toggle("on", state.monsterRotationRevealed);
        this.monsterTodaySpotToggleButton.setAttribute("aria-pressed", state.monsterRotationRevealed ? "true" : "false");
    }

    updateAlwaysShowBossButton() {
        if (!this.showMonsterToggleButton) return;
        this.showMonsterToggleButton.classList.toggle("on", state.alwaysShowBoss);
        this.showMonsterToggleButton.setAttribute("aria-pressed", state.alwaysShowBoss ? "true" : "false");
    }

    updateRealtimeTimeToggleButton(renderOnTimeChange = true) {
        if (!this.realtimeTimeToggleBtn) return;
        const isDay = isRealtimeDayTime();
        const isTimeChanged = this.lastRealtimeIsDay !== isDay;
        this.lastRealtimeIsDay = isDay;
        this.realtimeTimeToggleBtn.textContent = isDay ? "실시간 ☀️️" : "실시간 🌙";
        this.realtimeTimeToggleBtn.classList.toggle("on", state.realtimeTimeFilterEnabled);
        this.realtimeTimeToggleBtn.setAttribute("aria-pressed", state.realtimeTimeFilterEnabled ? "true" : "false");
        if (renderOnTimeChange && isTimeChanged && state.realtimeTimeFilterEnabled) {
            this.deps.scheduleRender(true);
        }
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