import {state} from "../state/state.js";

class FilterPanel {
    setDependencies(deps) {
        this.deps = deps;
    }

    init() {
        this.filterButtons = document.querySelectorAll(".filter-btn[data-group]");
        this.controlsSection = document.getElementById("controls");
        this.buildButtons();
        this.registerEvents();
        this.updateState();
    }

    registerEvents() {
        this.filterButtons.forEach((btn) => {
            btn.addEventListener("click", () => {
                const group = btn.dataset.group;
                const value = btn.dataset.value;
                const set = state.filters[group];
                if (set.has(value)) {
                    set.delete(value);
                } else {
                    set.add(value);
                }
                this.updateState();
                this.deps.saveAndRender();
            });
        });
    }

    buildButtons() {
        this.filterButtons.forEach((btn) => {
            const img = document.createElement("img");
            img.className = "filter-icon";
            img.src = `./assets/icons/filter/${btn.dataset.value}.svg`;
            const label = document.createElement("span");
            label.className = "filter-label";
            label.textContent = btn.textContent;
            btn.replaceChildren(img, label);
        });
    }

    updateState() {
        this.filterButtons.forEach((btn) => {
            const group = btn.dataset.group;
            const value = btn.dataset.value;
            btn.classList.toggle("active", state.filters[group].has(value));
        });
        this.controlsSection.hidden = state.isTipsMode;
        this.controlsSection.classList.toggle("filter-fullscreen", state.isMapFullscreen);
    }
}

const filterPanel = new FilterPanel();
export default filterPanel;