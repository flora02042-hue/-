import { getRequestHeaders } from "../../../../script.js";

const extensionName = "lore-manager";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

// Загрузить список всех лорбуков с сервера
async function fetchAllLorebooks() {
    try {
        const response = await fetch("/api/worldinfo/list", {
            method: "POST",
            headers: getRequestHeaders(),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.error(`[${extensionName}] Ошибка загрузки лорбуков:`, err);
        toastr.error("Не удалось загрузить список лорбуков", "Lore Book Manager");
        return [];
    }
}

// Удалить один лорбук
async function deleteLorebook(name) {
    const response = await fetch("/api/worldinfo/delete", {
        method: "POST",
        headers: getRequestHeaders(),
        body: JSON.stringify({ name }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return true;
}

// Обновить счётчик
function updateCount() {
    const total = $("#lore-manager-list .lore-manager-item").length;
    const selected = $("#lore-manager-list input:checked").length;
    $("#lore-manager-count").text(`Лорбуков: ${total} | Выбрано: ${selected}`);
}

// Отрисовать список лорбуков
function renderList(lorebooks) {
    const $list = $("#lore-manager-list");
    $list.empty();

    if (!lorebooks || lorebooks.length === 0) {
        $list.append('<div class="lore-manager-empty">Лорбуки не найдены</div>');
        updateCount();
        return;
    }

    lorebooks.forEach((name) => {
        const safeId = `lore-cb-${name.replace(/[^a-zA-Z0-9]/g, "_")}`;
        const $item = $(`
            <div class="lore-manager-item">
                <input type="checkbox" id="${safeId}" data-name="${name}" />
                <label for="${safeId}">${name}</label>
            </div>
        `);
        $item.find("input").on("change", updateCount);
        $list.append($item);
    });

    updateCount();
}

// Главная функция обновления
async function refreshList() {
    const $list = $("#lore-manager-list");
    $list.html('<div class="lore-manager-empty"><i class="fa-solid fa-spinner fa-spin"></i> Загрузка...</div>');
    const lorebooks = await fetchAllLorebooks();
    renderList(lorebooks);
}

// Удалить выбранные
async function deleteSelected() {
    const $checked = $("#lore-manager-list input:checked");
    if ($checked.length === 0) {
        toastr.warning("Ничего не выбрано", "Lore Book Manager");
        return;
    }

    const names = [];
    $checked.each(function () {
        names.push($(this).data("name"));
    });

    const confirmed = confirm(`Удалить ${names.length} лорбук(ов)?\n\n${names.join("\n")}`);
    if (!confirmed) return;

    let successCount = 0;
    let failCount = 0;

    for (const name of names) {
        try {
            await deleteLorebook(name);
            successCount++;
        } catch (err) {
            console.error(`[${extensionName}] Не удалось удалить "${name}":`, err);
            failCount++;
        }
    }

    if (successCount > 0) toastr.success(`Удалено: ${successCount}`, "Lore Book Manager");
    if (failCount > 0) toastr.error(`Ошибка при удалении: ${failCount}`, "Lore Book Manager");

    await refreshList();
}

// Инициализация — HTML встроен прямо в JS, никаких внешних файлов
jQuery(async () => {
    console.log(`[${extensionName}] Loading...`);
    try {
        const html = `
        <div class="lore-manager-settings">
            <div class="inline-drawer">
                <div class="inline-drawer-toggle inline-drawer-header">
                    <b>📚 Lore Book Manager</b>
                    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                </div>
                <div class="inline-drawer-content">
                    <div class="lore-manager-toolbar">
                        <button id="lore-manager-refresh" class="menu_button">
                            <i class="fa-solid fa-rotate-right"></i> Обновить
                        </button>
                        <button id="lore-manager-select-all" class="menu_button">
                            <i class="fa-solid fa-check-double"></i> Выбрать все
                        </button>
                        <button id="lore-manager-deselect-all" class="menu_button">
                            <i class="fa-solid fa-xmark"></i> Снять все
                        </button>
                        <button id="lore-manager-delete" class="menu_button" style="background:var(--SmartThemeRedColor,#c0392b)">
                            <i class="fa-solid fa-trash"></i> Удалить выбранные
                        </button>
                    </div>
                    <div class="lore-manager-count" id="lore-manager-count">Лорбуков: 0 | Выбрано: 0</div>
                    <div class="lore-manager-list" id="lore-manager-list">
                        <div class="lore-manager-empty">Нажмите «Обновить» для загрузки списка</div>
                    </div>
                </div>
            </div>
        </div>`;

        $("#extensions_settings2").append(html);

        $("#lore-manager-refresh").on("click", refreshList);
        $("#lore-manager-select-all").on("click", () => {
            $("#lore-manager-list input[type=checkbox]").prop("checked", true);
            updateCount();
        });
        $("#lore-manager-deselect-all").on("click", () => {
            $("#lore-manager-list input[type=checkbox]").prop("checked", false);
            updateCount();
        });
        $("#lore-manager-delete").on("click", deleteSelected);

        console.log(`[${extensionName}] ✅ Loaded`);
    } catch (error) {
        console.error(`[${extensionName}] ❌ Failed:`, error);
    }
});
