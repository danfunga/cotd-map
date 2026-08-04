import {state} from "../state/state.js";
import ImageRepository from "../repository/imageRepository.js";

class DetailPanel {
    constructor() {
        this.detailSheet = document.getElementById("detailSheet");
        this.detailBody = document.getElementById("detailBody");
        this.detailClose = document.getElementById("detailClose");
        this.detailBackdrop = document.getElementById("detailBackdrop");
    }

    setDependencies(deps) {
        this.deps = deps;
    }

    init() {
        this.registerEvents();
    }

    registerEvents() {
        this.detailClose.addEventListener("click", () => {
            this.closeDetail();
        });
        this.detailBackdrop.addEventListener("click", () => {
            this.closeDetail();
        });
        this.detailSheet.addEventListener("click", (event) => {
            if (!this.detailBody.contains(event.target)) this.closeDetail();
        });
        this.detailBody.addEventListener("click", (event) => {
            event.stopPropagation();
            if (event.target.classList.contains("detail-close-inline")) {
                this.closeDetail();
                return;
            }
            const toggle = event.target.closest("[data-action='toggle-caught']");
            if (!toggle) return;
            this.handleToggleCaught(toggle);
        });
    }

    /**
     * @param {Entity} entity
     * @param spotIndex
     */
    buildDetailHtml(entity, spotIndex = null) {
        const mini = this.minigameMeta(entity);
        const miniHtml = mini
            ? `<p><strong>미니게임:</strong> <span class="minigame-pill minigame-${mini.cls}">${mini.label}</span></p>`
            : "";
        const latinHtml = `<div class="detail-wide-row"><strong>학명:</strong> ${entity.latin || "-"}</div>`;
        const seasonHtml = this.seasonBar(entity);
        const noteHtml = entity.notes && entity.notes.trim() !== ""
            ? `<div class="detail-note"><strong>메모:</strong> ${entity.notes}</div>`
            : "";
        const spotImageBasePath = this.resolveSpotImagePath(entity, spotIndex);
        const spotHtml = spotImageBasePath ? this.buildSpotImagesHtml(spotImageBasePath) : "";
        return `
      <div class="fish-popup detail-theme">
        <div class="detail-title-row">
          <div class="detail-name-row">
            <div class="detail-title-display-name">
              <h3>${this.deps.entityManager.label(entity)}</h3>          
            </div>
            <div class="detail-title-origin-name">
              ${entity.name}
            </div>
          </div>
          <div class="detail-title-actions">
            ${this.buildCaughtButton(entity)}
            <button class="detail-close-inline" type="button" aria-label="닫기"> 닫기 </button>
          </div>
        </div>
              
        <div class="detail-layout">
          <div class="detail-info">
            <p><strong>분류:</strong> ${this.getLabelWithCategory(entity.category)}</p>
            <p><strong>활성 시간:</strong> ${this.availabilityTimeLabel([entity.timeBand])}</p>
            <p><strong>희귀도:</strong> <span class="rarity-pill rarity-${entity.rarity}">${entity.rarity}</span></p>
            <p><strong>그림자 크기:</strong> ${this.shadowSizeLabel(entity.shadowSizes)}</p>
            <p><strong>그림자 속도:</strong> ${this.shadowSpeedLabel(entity.shadowSpeeds)}</p>
            ${miniHtml}
          </div>        
          <div class="detail-visual">
              <img class="detail-entity-image" src="${ImageRepository.getFigure(state.currentMapId, entity)}" alt="${this.deps.entityManager.label(entity)}" >
          </div>
        </div>
        <div class="detail-bottom">
          ${latinHtml}
          ${seasonHtml}
          ${noteHtml}
          ${spotHtml}
        </div>
      </div>`;
    }

    buildCaughtButton(entity) {
        const caught = this.deps.entityManager.isCaught(entity);
        return `
        <button
            class="caught-toggle ${caught ? "on" : ""}"
            data-action="toggle-caught"
            data-id="${entity.id}"
            data-category="${entity.category}"
            type="button">
            ${caught ? "잡음 ✓" : "미획득"}
        </button>
    `;
    }

    buildSpotImagesHtml(basePath) {
        return `
        <div class="entity-spot" data-base-path="${basePath}" data-max-variant="6" style="display:none;"></div>
    `;
    }

    resolveSpotImagePath(entity, spotIndex = null) {
        if (entity.category === "monster") {
            return spotIndex === null ? null : ImageRepository.getMonsterSpot(state.currentMapId, spotIndex);
        }
        if (!["fish", "creature", "item"].includes(entity.category)) return null;
        return ImageRepository.getEntitySpot(state.currentMapId, entity);
    }

    getLabelWithCategory(value) {
        const map = {
            fish: "물고기",
            creature: "생명체",
            item: "아이템",
            monster: "몬스터",
        };
        return map[value] || "알수없음";
    }

    availabilityTimeLabel(values) {
        if (!values || values.length === 0) return "종일";
        const map = {"day": "낮", "night": "밤", "both": "종일"};
        const labels = values.map((v) => map[v]).filter(Boolean);
        return labels.length ? labels.join(", ") : "종일";
    }

    shadowSizeLabel(values) {
        if (!values || values.length === 0) return "없음";
        const map = {0: "작음", 1: "보통", 2: "중형", 3: "대형"};
        const labels = values.map((v) => map[v]).filter(Boolean);
        return labels.length ? labels.join(", ") : "없음";
    }

    shadowSpeedLabel(values) {
        if (!values || values.length === 0) return "없음";
        const map = {0: "정지", 1: "보통", 2: "빠름"};
        const labels = values.map((v) => map[v]).filter(Boolean);
        return labels.length ? labels.join(", ") : "없음";
    }

    seasonBar(entity) {
        if (!Array.isArray(entity.seasons) || entity.seasons.length !== 12) return "";
        if (entity.seasons.every((v) => v === true)) {
            entity.seasons = [true, true, true, true, true, true, true, true, true, true, true, true];
        }
        const currentMonth = new Date().getMonth();
        const blocks = entity.seasons
        .map((ok, idx) => {
            const active = ok ? "on" : "off";
            const now = idx === currentMonth ? "now" : "";
            return `<span class="mcell ${active} ${now}">${idx + 1}</span>`;
        })
        .join("");
        return `<div class="season-wrap"><div class="season-grid">${blocks}</div><div class="season-now">현재 달: ${currentMonth + 1}월</div></div>`;
    }

    minigameMeta(entity) {
        const d = entity.difficulty;
        if (d === null || d === undefined || d === 0) return {label: "없음", cls: "none"};
        if (d === 1) return {label: "고정", cls: "fixed"};
        if (d === 2) return {label: "움직임", cls: "moving"};
        return {label: "회전", cls: "rotate"};
    }

    initializeSpotImages(root = this.detailBody) {
        root.querySelectorAll(".entity-spot[data-base-path]").forEach((container) => {
            this.loadNextSpotImage(container, 0);
        });
    }

    loadNextSpotImage(container, variant) {
        const basePath = container.dataset.basePath;
        const maxVariant = Number(container.dataset.maxVariant || 0);
        if (!basePath || variant > maxVariant) return;
        const image = document.createElement("img");
        image.onload = () => {
            container.style.display = "flex";
            this.loadNextSpotImage(container, variant + 1);
        };
        image.onerror = () => {
            image.remove();
            if (container.children.length === 0) container.style.display = "none";
        };
        image.src = variant === 0 ? `${basePath}.png` : `${basePath}-${variant}.png`;
        container.appendChild(image);
    }

    isPanelOpen() {
        return this.detailSheet.classList.contains("open")
    }

    openDetail(html) {
        this.detailBody.innerHTML = html;
        const image = this.detailBody.querySelector(".detail-entity-image");
        if (image) {
            image.onerror = () => {
                image.style.display = "none";
            };
        }
        this.initializeSpotImages(this.detailBody);
        this.detailSheet.classList.add("open");
        this.detailSheet.setAttribute("aria-hidden", "false");
    }

    openEntityDetail(entity, spotIndex = null) {
        state.currentDetailEntity = entity;
        this.openDetail(this.buildDetailHtml(entity, spotIndex));
    }

    refreshCaughtButton() {
        const entity = state.currentDetailEntity;
        if (!entity) {
            return;
        }
        const button = this.detailBody.querySelector(".caught-toggle");
        if (!button) {
            return;
        }
        const caught = this.deps.entityManager.isCaught(entity);
        button.classList.toggle("on", caught);
        button.textContent = caught ? "잡음 ✓" : "미획득";
    }

    closeDetail() {
        state.currentDetailEntity = null;
        if (this.detailSheet.contains(document.activeElement)) {
            document.activeElement.blur();
        }
        this.detailSheet.classList.remove("open");
        this.detailSheet.setAttribute("aria-hidden", "true");
    }

    handleToggleCaught(toggle) {
        const entity = state.currentDetailEntity;
        if (!entity) return;
        const {id, category} = toggle.dataset;
        if (entity.id !== id || entity.category !== category) return;
        this.deps.entityManager.toggleCaught(entity);
        this.refreshCaughtButton();
    }
}

const detailPanel = new DetailPanel();
export default detailPanel;