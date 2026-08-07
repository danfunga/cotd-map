import {state} from "../state/state.js";
import {mapsById} from "../../content/mapIndex.js";
import {showToast} from "../ui/toast.js";
import MarkerManager from "./markerManager.js";

class MapManager {
    init() {
        this.mapLayout = document.getElementById("mapLayout");
        this.createMapIfNeeded();
        this.registerEvents();
        this.renderMap();
    }

    registerEvents() {
        window.addEventListener("resize", () => {
            this.handleViewportChange();
        });
        window.addEventListener("orientationchange", () => {
            setTimeout(() => {
                state.mapInstance?.invalidateSize();
                this.fitCurrentMapBounds();
            }, 300);
        });
    }

    createMapIfNeeded() {
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
        this.installSingleFingerDoubleTapZoomIn();
        this.installTwoFingerDoubleTapZoomOut();
    }

    // 모바일에서 한 손가락 더블탭으로 확대, 두 손가락 더블탭으로 축소 기능을 구현합니다.
    // iOS Safari의 경우 페이지 전체의 핀치/더블탭 줌이 방해될 수 있어,
    //  map 영역 외에서는 300ms 이내의 터치가 발생하면 기본 동작을 막도록 했습니다.
    //  map 영역에서는 별도의 로직으로 처리합니다.
    installSingleFingerDoubleTapZoomIn() {
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

    installTwoFingerDoubleTapZoomOut() {
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

    handleViewportChange() {
        this.fitCurrentMapBounds();
    }

    fitCurrentMapBounds() {
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

    renderMap() {
        if (state.isTipsMode) return;
        const mapInfo = mapsById[state.currentMapId];
        const bounds = [[0, 0], [mapInfo.imageHeight, mapInfo.imageWidth]];
        if (mapInfo.imageWidth && mapInfo.imageHeight) {
            this.mapLayout.style.setProperty("--active-map-aspect", mapInfo.imageWidth / mapInfo.imageHeight);
        }
        state.mapInstance.eachLayer((layer) => {
            if (layer instanceof L.ImageOverlay) state.mapInstance.removeLayer(layer);
        });
        L.imageOverlay(mapInfo.imagePath, bounds).addTo(state.mapInstance);
        this.fitCurrentMapBounds();
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
}

const mapManager = new MapManager();
export default mapManager;