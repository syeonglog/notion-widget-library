"use strict";

const LT = window.LittleThings;

let tasks = LT.loadTasks();

let currentView = "today";
let currentCategory = "All";

let editingId = null;
let deletingEntry = null;

const $ = id => document.getElementById(id);

/* ==========================================
   Render
========================================== */

function render() {

    tasks = LT.loadTasks();

    document.querySelectorAll(".tab").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.view === currentView
        );
    });

    const titles = {
        today: "Today's Tasks",
        tomorrow: "Tomorrow's Tasks",
        someday: "Someday Tasks",
        overdue: "Overdue Tasks",
        history: "Completed Tasks"
    };

    $("viewTitle").textContent = titles[currentView];

    $("addButton").hidden = currentView === "history";

    renderCategories();
    renderTasks();
}

function renderCategories() {

    $("categoryFilters").replaceChildren();

    ["All", ...LT.CATEGORIES].forEach(category => {

        const button = document.createElement("button");

        button.className = "filter-button";
        button.textContent = category;

        if (category === currentCategory) {
            button.classList.add("active");
        }

        button.onclick = () => {
            currentCategory = category;
            renderCategories();
            renderTasks();
        };

        $("categoryFilters").appendChild(button);
    });
}

function renderTasks() {

    const list = $("taskList");
    list.replaceChildren();

    let entries = LT.getEntries(tasks, currentView);

    if (currentCategory !== "All") {
        entries = entries.filter(entry =>
            entry.task.category === currentCategory
        );
    }

    $("taskCount").textContent = `${entries.length} tasks`;

    $("emptyState").hidden = entries.length !== 0;

    entries.forEach(entry => {
        list.appendChild(createTaskElement(entry));
    });
}

function createTaskElement(entry) {

    const { task, date, completed } = entry;

    const row = document.createElement("div");
    row.className = "task-item";

    if (completed) {
        row.classList.add("completed");
    }

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-checkbox";
    checkbox.checked = completed;

    checkbox.setAttribute(
        "aria-label",
        `${task.title} 완료 상태 변경`
    );

    checkbox.onchange = () => {
        LT.toggleTask(tasks, task.id, date);
        render();
    };

    const content = document.createElement("div");
    content.className = "task-content";

    const name = document.createElement("div");
    name.className = "task-name";
    name.textContent = task.title;

    const meta = document.createElement("div");
    meta.className = "task-meta";

    addBadge(meta, task.category);

    if (task.priority === "high") {
        addBadge(meta, "High", "high");
    }

    if (task.repeat !== "none") {

        const names = {
            daily: "Daily",
            weekdays: "Weekdays",
            weekends: "Weekends",
            weekly: "Weekly"
        };

        addBadge(
            meta,
            `↻ ${names[task.repeat]}`,
            "repeat"
        );
    }

    if (date) {
        addBadge(meta, LT.formatDate(date));
    }

    content.appendChild(name);
    content.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const edit = document.createElement("button");
    edit.className = "icon-button";
    edit.textContent = "✎";
    edit.title = "수정";
    edit.setAttribute("aria-label", "수정");

    edit.onclick = () => openEditor(task);

    const remove = document.createElement("button");
    remove.className = "icon-button";
    remove.textContent = "×";
    remove.title = "삭제";
    remove.setAttribute("aria-label", "삭제");

    remove.onclick = () => requestDelete(entry);

    actions.append(edit, remove);
    row.append(checkbox, content, actions);

    return row;
}

function addBadge(container, text, extraClass = "") {

    const badge = document.createElement("span");
    badge.className = `badge ${extraClass}`;
    badge.textContent = text;

    container.appendChild(badge);
}

/* ==========================================
   Navigation
========================================== */

document.querySelectorAll(".tab").forEach(button => {

    button.onclick = () => {
        currentView = button.dataset.view;
        currentCategory = "All";

        render();
    };
});

/* ==========================================
   Task Editor
========================================== */

function openEditor(task = null) {

    editingId = task?.id || null;

    $("taskForm").reset();

    $("editorTitle").textContent = task
        ? "Edit Task ♡"
        : "New Task ♡";

    if (task) {

        $("taskTitle").value = task.title;
        $("taskCategory").value = task.category;
        $("taskPriority").value = task.priority;
        $("taskRepeat").value = task.repeat;

        const today = LT.today();
        const tomorrow = LT.addDays(today, 1);

        if (task.dueDate === null) {
            $("taskSchedule").value = "someday";

        } else if (task.dueDate === today) {
            $("taskSchedule").value = "today";

        } else if (task.dueDate === tomorrow) {
            $("taskSchedule").value = "tomorrow";

        } else {
            $("taskSchedule").value = "custom";
        }

        $("taskDueDate").value = task.dueDate || "";

    } else {

        $("taskPriority").value = "medium";
        $("taskRepeat").value = "none";

        $("taskSchedule").value =
            currentView === "tomorrow" ? "tomorrow" :
            currentView === "someday" ? "someday" :
            "today";
    }

    updateSchedule();
    updateRepeatHelp();

    $("editor").hidden = false;

    $("taskTitle").focus();
}

function closeEditor() {
    $("editor").hidden = true;
    editingId = null;
}

function updateSchedule() {

    const custom = $("taskSchedule").value === "custom";

    $("customDateArea").hidden = !custom;
    $("taskDueDate").required = custom;

    // Someday는 반복 시작일이 없으므로 반복 불가
    const someday = $("taskSchedule").value === "someday";

    $("taskRepeat").disabled = someday;

    if (someday) {
        $("taskRepeat").value = "none";
    }

    if (custom && !$("taskDueDate").value) {
        $("taskDueDate").value = LT.today();
    }

    updateRepeatHelp();
}

function updateRepeatHelp() {

    const descriptions = {
        none: "한 번만 실행하는 할 일이에요.",
        daily: "시작일부터 매일 반복돼요.",
        weekdays: "시작일부터 월~금요일에 반복돼요.",
        weekends: "시작일부터 토·일요일에 반복돼요.",
        weekly: "시작일과 같은 요일에 매주 반복돼요."
    };

    $("repeatHelp").textContent =
        descriptions[$("taskRepeat").value];
}

function resolveDate() {

    switch ($("taskSchedule").value) {

        case "today":
            return LT.today();

        case "tomorrow":
            return LT.addDays(LT.today(), 1);

        case "someday":
            return null;

        case "custom":
            return $("taskDueDate").value;

        default:
            return LT.today();
    }
}

$("taskForm").onsubmit = event => {

    event.preventDefault();

    const title = $("taskTitle").value.trim();

    if (!title) return;

    const dueDate = resolveDate();

    const data = {
        title,
        category: $("taskCategory").value,
        priority: $("taskPriority").value,
        dueDate,
        repeat: dueDate === null
            ? "none"
            : $("taskRepeat").value
    };

    if (editingId) {

        const task = tasks.find(t => t.id === editingId);

        if (task) {
            const scheduleChanged =
                task.dueDate !== data.dueDate ||
                task.repeat !== data.repeat;

            Object.assign(task, data);

            // 반복 규칙 변경 시 기존 완료 내역은 유지하되
            // 새 규칙과 무관한 기록을 잘못 표시하지 않도록 초기화
            if (scheduleChanged) {
                task.occurrences = {};
                task.exceptions = [];
                task.completed = false;
                task.completedAt = null;
            }
        }

    } else {

        tasks.push({
            id: LT.createId(),
            ...data,

            completed: false,
            completedAt: null,

            occurrences: {},
            exceptions: [],

            createdAt: new Date().toISOString()
        });
    }

    if (LT.saveTasks(tasks)) {
        closeEditor();
        render();
        showToast("저장했어요 ♡");
    }
};

/* ==========================================
   Delete
========================================== */

function requestDelete(entry) {

    deletingEntry = entry;

    if (entry.task.repeat === "none") {

        LT.deleteTask(tasks, entry.task.id, entry.date);

        deletingEntry = null;
        render();
        showToast("삭제했어요.");

        return;
    }

    $("deleteDialog").hidden = false;
}

$("deleteOne").onclick = () => {

    if (!deletingEntry) return;

    LT.deleteTask(
        tasks,
        deletingEntry.task.id,
        deletingEntry.date,
        "one"
    );

    finishDelete();
};

$("deleteAll").onclick = () => {

    if (!deletingEntry) return;

    LT.deleteTask(
        tasks,
        deletingEntry.task.id,
        deletingEntry.date,
        "all"
    );

    finishDelete();
};

function finishDelete() {
    deletingEntry = null;

    $("deleteDialog").hidden = true;

    render();
    showToast("삭제했어요.");
}

$("cancelDelete").onclick = () => {
    $("deleteDialog").hidden = true;
    deletingEntry = null;
};

/* ==========================================
   Notification
========================================== */

let toastTimer;

function showToast(message) {

    const toast = $("toast");

    clearTimeout(toastTimer);

    toast.textContent = message;
    toast.classList.add("show");

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2000);
}

/* ==========================================
   Events
========================================== */

$("addButton").onclick = () => openEditor();

$("closeEditor").onclick = closeEditor;
$("cancelButton").onclick = closeEditor;

$("taskSchedule").onchange = updateSchedule;
$("taskRepeat").onchange = updateRepeatHelp;

$("editor").addEventListener("click", event => {
    if (event.target === $("editor")) {
        closeEditor();
    }
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closeEditor();
        $("deleteDialog").hidden = true;
    }
});

window.addEventListener("storage", event => {
    if (event.key === LT.STORAGE_KEY) {
        render();
    }
});

window.addEventListener(LT.UPDATE_EVENT, render);

document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        render();
    }
});

// 날짜 변경 감지
let lastDate = LT.today();

setInterval(() => {

    const current = LT.today();

    if (current !== lastDate) {
        lastDate = current;
        render();
    }

}, 30000);

render();