import {state} from "../state/state.js";
import PersistedState from "../state/persistedState.js";
import {mapsById} from "../../content/mapIndex.js";
import ImageRepository from "../repository/imageRepository.js";

class MarkerManager {

    constructor() {

    }

    setDependencies(deps) {
        this.deps = deps;
    }

    // scheduleRender(refreshPanel = true)
    scheduleRender(refreshPanel = true) {
        if (refreshPanel) state.scheduledRefreshPanel = true;
        if (state.renderScheduled) return;
        state.renderScheduled = true;
        requestAnimationFrame(() => {
            state.renderScheduled = false;
            const shouldRefreshPanel = state.scheduledRefreshPanel;
            state.scheduledRefreshPanel = false;
            void this.render(shouldRefreshPanel);
        });
    }

    async render(refreshPanel = true) {
        const requestId = ++state.renderRequestId;
        const mapInfo = mapsById[state.currentMapId];
        // const entities = await loadMapEntities(state.currentMapId);
        const cache = await this.deps.entityManager.loadMapEntities(state.currentMapId);

        if (requestId !== state.renderRequestId || mapInfo.id !== state.currentMapId) return;

        const filtered = cache.all.filter((entity) => this.deps.entityManager.passesCurrentFilters(entity));

        state.lastFilteredEntities = filtered;
        let activeStateChanged = false;
        if (state.resetActiveOnNextRender || !state.selection.initializedActiveMapIds.has(state.currentMapId)) {
            this.deps.entityManager.resetActiveEntitiesForMap(filtered);
            state.resetActiveOnNextRender = false;
            activeStateChanged = true;
        }
        if (refreshPanel) this.deps.renderEntityPanel();
        if (activeStateChanged) PersistedState.save();

        const nextActiveKeys = new Set();
        filtered.forEach((entity) => {
            if (!this.deps.entityManager.isEntityActive(entity)) {
                return;
            }
            const locs = Array.isArray(entity.locations) ? entity.locations : [];
            if (locs.length === 0) return;
            const bundle = this.getMarkerBundle(state.currentMapId, entity);
            this.updateMarkerBundleIcons(bundle, entity);
            if (this.syncMarkerBundleLayers(bundle, entity)) nextActiveKeys.add(bundle.key);
        });

        state.selection.activeMarkerKeys.forEach((key) => {
            if (nextActiveKeys.has(key)) return;
            const [mapId] = key.split(":");
            const byMap = state.cache.markerBundle.get(mapId);

            const bundle = byMap?.get(key);
            if (!bundle) return;
            bundle.markers.forEach((marker) => state.markerLayer.removeLayer(marker));
        });

        state.selection.activeMarkerKeys.clear();
        nextActiveKeys.forEach((key) => state.selection.activeMarkerKeys.add(key));
    }

    getMarkerBundle(mapId, entity) {
        const key = this.deps.entityManager.entityKey(entity, mapId);
        let byMap = state.cache.markerBundle.get(mapId);
        if (!byMap) {
            byMap = new Map();
            state.cache.markerBundle.set(mapId, byMap);
        }
        let bundle = byMap.get(key);
        if (bundle) return bundle;

        const locs = Array.isArray(entity.locations) ? entity.locations : [];
        const markers = locs.map((l, idx) => {
            const marker = L.marker([l.y, l.x], {icon: this.markerIcon(entity, idx === 0, idx, l.hint_by_bubble)});
            marker.on("click", () => this.deps.openEntityDetail(entity, idx));
            marker.on("add", () => {
                const element = marker.getElement();
                const image = element?.querySelector(".photo-marker");
                const fallback = element?.querySelector(".marker-fallback-dot");
                if (!image) return;
                image.onerror = () => {
                    image.style.display = "none";
                    if (fallback) {
                        fallback.style.display = "block";
                    }
                };
            });
            return marker;
        });
        bundle = {
            key,
            markers,
            iconSignatures: markers.map((_, idx) => this.markerVisualSignature(entity, idx === 0))
        };
        byMap.set(key, bundle);
        return bundle;
    }

    updateMarkerBundleIcons(bundle, entity) {
        const locs = Array.isArray(entity.locations) ? entity.locations : [];
        bundle.markers.forEach((marker, idx) => {
            const nextSig = this.markerVisualSignature(entity, idx === 0);
            if (bundle.iconSignatures[idx] === nextSig) return;
            marker.setIcon(this.markerIcon(entity, idx === 0, idx, Boolean(locs[idx]?.hint_by_bubble)));
            bundle.iconSignatures[idx] = nextSig;
        });
    }

    syncMarkerBundleLayers(bundle, entity) {
        let hasVisibleMarker = false;
        bundle.markers.forEach((marker, idx) => {
            const shouldShow = !this.deps.shouldHideMarkerByRotation(entity, idx);
            if (shouldShow) {
                hasVisibleMarker = true;
                if (!state.markerLayer.hasLayer(marker)) state.markerLayer.addLayer(marker);
            } else if (state.markerLayer.hasLayer(marker)) {
                state.markerLayer.removeLayer(marker);
            }
        });
        return hasVisibleMarker;
    }

    markerIcon(entity, isPrimary = false, markerIndex = 0, hintByBubble = false) {
        const rarityKey = entity.rarity;
        const categoryKey = entity.category || "fish";
        const caught = this.deps.entityManager.isCaught(entity);
        const caughtClass = caught ? "caught" : "";
        const markerNumber = categoryKey === "monster" ? (markerIndex + 1) : null;
        const bubbleHintClass = hintByBubble ? "bubble-hint-marker" : "";
        if (categoryKey === "monster") {
            isPrimary = false;
        }
        const timeDimClass = this.deps.shouldDimByRealtimeTime(entity) ? "time-dim" : "";

        return L.divIcon({
            className: "photo-marker-wrap",
            html: `
      <div class="marker-fallback-dot rarity-${rarityKey} category-${categoryKey}" ></div>
      <img class="photo-marker rarity-${rarityKey} ${timeDimClass} ${bubbleHintClass} ${isPrimary ? "primary-location" : ""} ${caughtClass}"
        src="${ImageRepository.getPortrait(state.currentMapId, entity)}"
        alt="${this.deps.entityManager.label(entity)}"
      >
      ${markerNumber ? `<span class="marker-number ${timeDimClass}">${markerNumber}</span>` : ""}
      ${caught ? `<span class="caught-v marker-v ${timeDimClass}">✓</span>` : ""}
    `,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
            popupAnchor: [0, -16]
        });
    }

    markerVisualSignature(entity, isPrimary) {
        const activeMonsterIndex = this.deps.getMonsterRotationActiveIndex(entity);
        return `${entity.rarity}|${entity.category}|${isPrimary ? "1" : "0"}|${this.deps.entityManager.isCaught(entity) ? "1" : "0"}|${state.monsterRotationRevealed ? "1" : "0"}|${activeMonsterIndex ?? "x"}|${this.deps.shouldDimByRealtimeTime(entity) ? "D" : "N"}`;
    }

}

export default new MarkerManager();