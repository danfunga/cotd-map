import {state} from "../state/state.js";
import ImageRepository from "../repository/imageRepository.js";

const CATEGORY_RANK = {
    fish: 0,
    creature: 1,
    item: 2,
};

const CATEGORY_LABEL = {
    fish: "물고기",
    creature: "생명체",
    item: "아이템",
};

const RARITY_RANK = {
    common: 3,
    rare: 2,
    epic: 1,
    monster: 0,
};

const DEFAULT_SORT_ORDER = 999;

class EntityPanel {
    constructor() {
        this.entityList = document.getElementById("entityList");
        this.groupUi = new Map();
        this.entityRow = new Map();
        this.groupItems = new Map();
    }

    setDependencies(deps) {
        this.deps = deps;
    }

    render() {
        this.groupItems.clear();
        this.deps.syncCaughtFilterAllButton();
        const sorted = this.sortEntities(state.lastFilteredEntities);
        const visibleCategories = ["fish", "creature", "item"].filter((category) => state.filters.category.has(category));

        const sections = visibleCategories.map((category) => {
            const groupItems = sorted.filter(e => e.category === category);
            this.groupItems.set(category, groupItems);

            const ui = this.getOrCreateGroupUi(category, CATEGORY_LABEL[category]);
            this.updateGroupHeaderState(category);
            this.updateGroupUi(category);

            const rowNodes = groupItems.map((entity) => {
                const rowUi = this.getOrCreateEntityRow(entity);
                this.updateEntityRow(rowUi, entity);
                return rowUi.row;
            });
            if (rowNodes.length === 0) {
                ui.body.replaceChildren(ui.emptyEl);
            } else {
                ui.body.replaceChildren(...rowNodes);
            }
            return ui.section;
        });
        this.entityList.replaceChildren(...sections);
    }

    updateGroupUi(category) {
        const ui = this.groupUi.get(category);
        if (!ui) return;

        ui.groupCaughtToggleButton.textContent = this.deps.caughtModeLabel(state.caughtFilterMode[category]);
        ui.arrowEl.textContent = state.panelFoldState[category] ? "▾" : "▸";
        ui.body.className = `entity-group-body ${state.panelFoldState[category] ? "open" : "closed"}`;
    }

    sortEntities(entities) {
        const sorted = [...entities];

        sorted.sort((a, b) => {
            const category = this.compareCategory(a, b);
            if (category !== 0) return category;
            return this.compareEntity(a, b);
        });
        return sorted;
    }

    compareCategory(a, b) {
        return (CATEGORY_RANK[a.category] ?? DEFAULT_SORT_ORDER) - (CATEGORY_RANK[b.category] ?? DEFAULT_SORT_ORDER);
    }

    compareEntity(a, b) {
        const rarity = (RARITY_RANK[a.rarity] ?? DEFAULT_SORT_ORDER) - (RARITY_RANK[b.rarity] ?? DEFAULT_SORT_ORDER);
        if (rarity !== 0) return rarity;
        const labelA = this.deps.label(a);
        const labelB = this.deps.label(b);
        return labelA.localeCompare(labelB);

    }

    getOrCreateGroupUi(category, labelText) {
        const cached = this.groupUi.get(category);
        if (cached) return cached;

        const section = document.createElement("section");
        section.className = "entity-group";

        const header = document.createElement("div");
        header.className = "entity-group-head";
        header.innerHTML = `
      <span>${labelText}</span>
      <span class="entity-group-info"></span>
      <button type="button" class="entity-group-caught-filter-btn" data-category="${category}"></button>
      <button type="button" class="entity-group-show-toggle-btn" data-category="${category}"></button>
      <span class="entity-group-count"></span>
      <span class="entity-group-arrow"></span>
  `;
        const body = document.createElement("div");
        body.className = "entity-group-body open";
        const emptyEl = document.createElement("div");
        emptyEl.className = "entity-empty";
        emptyEl.textContent = "표시할 항목 없음";

        section.append(header, body);
        const ui = {
            section,
            groupHeader: header,
            body,
            emptyEl,
            groupCaughtToggleButton: header.querySelector(".entity-group-caught-filter-btn"),
            groupShowToggleButton: header.querySelector(".entity-group-show-toggle-btn"),
            infoEl: header.querySelector(".entity-group-info"),
            countEl: header.querySelector(".entity-group-count"),
            arrowEl: header.querySelector(".entity-group-arrow")
        };

        ui.groupHeader.addEventListener("click", () => {
            this.handleGroupTitleFold(category);
        });

        ui.groupShowToggleButton.addEventListener("click", (e) => {
            e.stopPropagation();
            this.handleGroupShowHideToggle(category);

        });
        ui.groupCaughtToggleButton.addEventListener("click", (e) => {
            e.stopPropagation();
            this.handleGroupCaughtToggle(category);
        });

        this.groupUi.set(category, ui);
        return ui;
    }

    getOrCreateEntityRow(entity) {
        const key = this.deps.entityKey(entity);
        const cached = this.entityRow.get(key);
        if (cached) return cached;

        const row = document.createElement("div");
        row.innerHTML = `
    <span class="entity-left">
      <span class="entity-thumb-wrap">
        <img class="entity-thumb"  alt="" src="">
        <span class="entity-available-time-badge">∞</span>
      </span>
      <span class="entity-texts">
        <span class="entity-name"></span>
        <span class="entity-sub-name"></span>
      </span>
    </span>
    <span class="entity-count"></span>
    <button class="count-v-toggle" type="button" aria-label="획득 토글">
      <span class="caught-v count-v off">✓</span>
    </button>
  `;
        const rowUi = {
            row,
            thumb: row.querySelector(".entity-thumb"),
            thumbWrap: row.querySelector(".entity-thumb-wrap"),
            timeIconBadge: row.querySelector(".entity-available-time-badge"),
            nameEl: row.querySelector(".entity-name"),
            subNameEl: row.querySelector(".entity-sub-name"),
            countEl: row.querySelector(".entity-count"),
            countToggle: row.querySelector(".count-v-toggle"),
            countVEl: row.querySelector(".count-v")
        };

        rowUi.row.addEventListener("click", () => {

            const key = this.deps.entityKey(entity);
            if (state.selection.activeEntityKeys.has(key)) {
                state.selection.activeEntityKeys.delete(key);
            } else {
                state.selection.activeEntityKeys.add(key);
            }
            state.selection.initializedActiveMapIds.add(state.currentMapId);
            this.handleSingleRowToggle(entity, rowUi);
        });
        rowUi.thumb.addEventListener("click", (event) => {
            event.stopPropagation();
            this.deps.openEntityDetail(entity);
        });
        rowUi.thumb.onerror = function onThumbError() {
            this.style.display = "none";
        };

        rowUi.countToggle.addEventListener("click", (event) => {
            event.stopPropagation();
            const keyByEntity = this.deps.entityKey(entity);
            if (state.selection.caughtEntityKeys.has(keyByEntity)) state.selection.caughtEntityKeys.delete(keyByEntity);
            else state.selection.caughtEntityKeys.add(keyByEntity);
            this.deps.saveAndRender(true);
        });

        this.entityRow.set(key, rowUi);
        return rowUi;
    }

    updateEntityRow(rowUi, entity) {
        const rarityKey = entity.rarity;
        rowUi.row.className = `entity-row rarity-${rarityKey} ${this.deps.isEntityActive(entity) ? "" : "off"} ${this.deps.isCaught(entity) ? "caught" : ""}`;
        const count = Array.isArray(entity.locations) ? entity.locations.length : 0;
        rowUi.countEl.textContent = String(count);
        rowUi.countVEl.className = `caught-v count-v ${this.deps.isCaught(entity) ? "on" : "off"}`;
        rowUi.nameEl.className = `entity-name rarity-${rarityKey}`;
        rowUi.nameEl.textContent = this.deps.label(entity);
        rowUi.subNameEl.textContent = entity.name || "";
        const imagePath = ImageRepository.getPortrait(state.currentMapId, entity);
        if (rowUi.thumb.getAttribute("src") !== imagePath) {
            rowUi.thumb.src = imagePath;
        }
        rowUi.thumb.alt = this.deps.label(entity);

        const dimmed = this.deps.shouldDimByRealtimeTime(entity);
        rowUi.thumb.style.display = "";
        rowUi.thumb.classList.toggle("time-dim", dimmed);
        rowUi.timeIconBadge.classList.toggle("time-dim", dimmed);
        if (entity.category === "item") {
            rowUi.timeIconBadge.textContent = ""
        } else {
            rowUi.timeIconBadge.textContent = {
                day: "☀️", // 해
                night: "🌙" // 달
            }[entity.timeBand] ?? "∞";// 종일
        }
    }

    updateGroupHeaderState(category) {
        const ui = this.groupUi.get(category);
        if (!ui) return;
        // const groupItems = state.lastFilteredEntities.filter((ent) => ent.category === category);
        const groupItems = this.groupItems.get(category) ?? [];
        const allActive = groupItems.length > 0 && groupItems.every((ent) => this.deps.isEntityActive(ent));
        ui.groupShowToggleButton.textContent = allActive ? "🚫" : "👁️";// 눈  숨김

        const cache = state.cache.mapEntities.get(state.currentMapId);
        const totalEntries = cache.byCategory[category];
        const caughtCount = totalEntries.filter((entry) => this.deps.isCaught(entry)).length;
        ui.infoEl.textContent = String(caughtCount) + "/" + String(totalEntries.length);

        const activeCount = groupItems.filter((entry) => this.deps.isEntityActive(entry)).length;
        ui.countEl.textContent = String(activeCount) + "/" + String(groupItems.length);
    }

    // Event listener
    handleGroupTitleFold(category) {
        state.panelFoldState[category] = !state.panelFoldState[category];
        this.updateGroupUi(category);
    }

    handleGroupCaughtToggle(category) {
        state.caughtFilterMode[category] = this.deps.nextCaughtMode(state.caughtFilterMode[category]);
        this.deps.syncCaughtFilterAllButton();
        this.deps.saveAndRender(true);
    }

    handleGroupShowHideToggle(category) {
        // const group = state.lastFilteredEntities.filter((ent) => ent.category === category);
        const group = this.groupItems.get(category) ?? [];

        const allActive = group.length > 0 && group.every((ent) => this.deps.isEntityActive(ent));
        group.forEach((ent) => {
            const key = this.deps.entityKey(ent);
            if (allActive) state.selection.activeEntityKeys.delete(key);
            else state.selection.activeEntityKeys.add(key);
        });
        state.selection.initializedActiveMapIds.add(state.currentMapId);
        this.deps.saveAndRender(true);
    }

    handleSingleRowToggle(entity, rowUi) {
        this.updateEntityRow(rowUi, entity);
        const categoryKey = entity.category;
        this.updateGroupHeaderState(categoryKey);
        this.deps.saveAndRender(false);
    }

}

const entityPanel = new EntityPanel();
export default entityPanel;