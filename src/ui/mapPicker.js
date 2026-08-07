import {mapOrder, mapsById} from "../../content/mapIndex.js";
import {state} from "../state/state.js";
import PersistedState from "../state/persistedState.js";

const TIPS_PAGE_ID = "__tips__";

class MapPicker {
    setDependencies(deps) {
        this.deps = deps;
    }

    init() {
        this.container = document.getElementById("mapPicker");
        this.buildPicker();
        this.mapChips = this.container.querySelectorAll(".map-chip");
        this.updateState();
        this.registerEvents();
    }

    registerEvents() {
        this.container?.addEventListener('wheel', (event) => {
            if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
                // 기본 세로 스크롤 동작을 막습니다.
                event.preventDefault();
                // 휠을 위/아래로 굴릴 때 가로(왼쪽/오른쪽)로 스크롤되도록 설정합니다.
                // event.deltaY 값을 scrollLeft에 더해줌으로써 부드럽게 이동합니다.
                const horizontalDelta = event.deltaY;
                this.container.scrollLeft += horizontalDelta;
            }
        }, {passive: false}); // preventDefault()를 사용하기 위해 passive를 false로 설정합니다.
        this.mapChips.forEach((chip) => {
            chip.addEventListener("click", (event) => this.selectButton(event.currentTarget));
        });
    }

    buildPicker() {
        this.container.innerHTML = "";
        mapOrder.forEach((mapId) => {
            const mapInfo = mapsById[mapId];
            const button = document.createElement("button");
            button.type = "button";
            button.className = "map-chip";
            button.dataset.mapId = mapInfo.id;
            button.innerHTML = `<img src="${mapInfo.thumbnailPath}" alt="${mapInfo.name}"><span>${mapInfo.name}</span>`;
            this.container.appendChild(button);
        });
        const tipsButton = document.createElement("button");
        tipsButton.type = "button";
        tipsButton.className = "map-chip tips-chip";
        tipsButton.dataset.mapId = TIPS_PAGE_ID;
        tipsButton.innerHTML = "<span>Tips</span>";
        this.container.appendChild(tipsButton);
    }

    updateState() {
        this.mapChips.forEach((chip) => {
            const active = state.isTipsMode ? chip.dataset.mapId === TIPS_PAGE_ID : chip.dataset.mapId === state.currentMapId;
            chip.classList.toggle("active", active);
        });
    }

    setActiveButton(button) {
        this.mapChips.forEach((chip) => {
            chip.classList.toggle("active", chip === button);
        });
    }

    selectButton(button) {
        this.setActiveButton(button);
        const mapId = button.dataset.mapId;
        if (mapId === TIPS_PAGE_ID) {
            this.selectTips();
        } else {
            this.selectMap(mapId);
        }
        PersistedState.save();
        this.deps.renderMap();
    }

    selectTips() {
        state.isTipsMode = true;
    }

    selectMap(mapId) {
        state.isTipsMode = false;
        state.currentMapId = mapId;
    }
}

const mapPicker = new MapPicker();
export default mapPicker;