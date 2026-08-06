import PersistedState from "../state/persistedState.js";

class StateImportExport {
    constructor() {
    }

    setDependencies(deps) {
        this.deps = deps;
    }

    init() {
        this.exportStateBtn = document.getElementById("exportStateBtn");
        this.importStateBtn = document.getElementById("importStateBtn");
        this.importedStateDialog = document.getElementById("importStateDialog");
        this.importedTextContents = document.getElementById("importStateText");
        this.importCancelBtn = document.getElementById("btnImportCancel");
        this.importOkBtn = document.getElementById("btnImportOk");
        this.registerEvents();
    }

    registerEvents() {
        this.importCancelBtn.addEventListener("click", () => {
            this.importedStateDialog.close();
        });
        this.importOkBtn.addEventListener("click", () => {
            this.importUserStateFile(this.importedTextContents.value);
            this.importedStateDialog.close();
        });
        this.exportStateBtn?.addEventListener("click", () => {
            void PersistedState.export();
        });
        this.importStateBtn?.addEventListener("click", () => this.showImportUserStateDialog());
    }

    importUserStateFile(jsonText) {
        try {
            PersistedState.import(jsonText);
            this.deps.refreshUI();
            alert("가져오기가 완료되었습니다.");
        } catch (error) {
            alert(error instanceof Error ? error.message : "가져오기에 실패했습니다.");
        }
    }

    showImportUserStateDialog() {
        this.importedTextContents.value = "";
        this.importedStateDialog.showModal();
    }
}

const
    stateImportExport = new StateImportExport();
export default stateImportExport;