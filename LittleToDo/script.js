/* ==========================================
   LITTLE THINGS
   My Daily To-Do Widget
========================================== */

"use strict";

/* ==========================================
   Configuration
========================================== */

const STORAGE_KEY = "littleThingsTasks_v1";

const CATEGORIES = [
    "Personal",
    "Study",
    "Career",
    "Money",
    "Life"
];

const VIEW_LABELS = {
    today: "Today's Tasks",
    tomorrow: "Tomorrow's Tasks",
    someday: "Someday Tasks",
    overdue: "Overdue Tasks",
    history: "Completed Tasks"
};

const PRIORITY_ORDER = {
    high: 0,
    medium: 1,
    low: 2
};

/* ==========================================
   State
========================================== */

let tasks = loadTasks();

let currentView = "today";
let currentCategory = "All";
let editingTaskId = null;

let toastTimer = null;
let lastRenderedDate = getLocalDate();

/* ==========================================
   DOM Elements
========================================== */

const elements = {
    todayDate: document.getElementById("todayDate"),

    progressCount: document.getElementById("progressCount"),
    progressText: document.getElementById("progressText"),
    progressFill: document.getElementById("progressFill"),
    progressTrack: document.getElementById("progressTrack"),

    todayCount: document.getElementById("todayCount"),
    tomorrowCount: document.getElementById("tomorrowCount"),
    somedayCount: document.getElementById("somedayCount"),
    overdueCount: document.getElementById("overdueCount"),

    sectionTitle: document.getElementById("sectionTitle"),
    sectionEyebrow: document.getElementById("sectionEyebrow"),
    taskCounter: document.getElementById("taskCounter"),

    categoryFilters: document.getElementById("categoryFilters"),
    taskList: document.getElementById("taskList"),

    emptyState: document.getElementById("emptyState"),
    emptyMessage: document.getElementById("emptyMessage"),

    openAddButton: document.getElementById("openAddButton"),

    taskModal: document.getElementById("taskModal"),
    modalTitle: document.getElementById("modalTitle"),

    taskForm: document.getElementById("taskForm"),
    taskTitle: document.getElementById("taskTitle"),
    taskCategory: document.getElementById("taskCategory"),
    taskPriority: document.getElementById("taskPriority"),
    taskSchedule: document.getElementById("taskSchedule"),

    customDateGroup: document.getElementById("customDateGroup"),
    taskDueDate: document.getElementById("taskDueDate"),

    closeModalButton: document.getElementById("closeModalButton"),
    cancelButton: document.getElementById("cancelButton"),

    toast: document.getElementById("toast")
};

/* ==========================================
   Date Utilities
========================================== */

// 로컬 날짜를 YYYY-MM-DD로 반환
// UTC 변환으로 날짜가 밀리는 문제 방지

function getLocalDate(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// 오늘 기준 날짜 계산

function getRelativeDate(days) {
    const date = new Date();

    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + days);

    return getLocalDate(date);
}

// 날짜 표시

function formatDate(dateString) {
    if (!dateString) {
        return "Someday";
    }

    const [year, month, day] = dateString.split("-").map(Number);

    const date = new Date(year, month - 1, day);

    return date.toLocaleDateString("ko-KR", {
        month: "short",
        day: "numeric"
    });
}

// 헤더 날짜

function renderCurrentDate() {
    const now = new Date();

    elements.todayDate.textContent = now.toLocaleDateString(
        "en-US",
        {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "long"
        }
    );
}

/* ==========================================
   Storage
========================================== */

function loadTasks() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            return [];
        }

        const parsed = JSON.parse(saved);

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.filter(task =>
            task &&
            typeof task.id === "string" &&
            typeof task.title === "string" &&
            (
                task.dueDate === null ||
                /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate)
            )
        );

    } catch (error) {
        console.error("Failed to load tasks:", error);
        return [];
    }
}

function saveTasks() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(tasks)
        );

        return true;

    } catch (error) {
        console.error("Failed to save tasks:", error);

        showToast("저장할 수 없어요. 브라우저 설정을 확인해 주세요.");
        return false;
    }
}

/* ==========================================
   Task Classification
========================================== */

function getTaskView(task) {
    if (task.completed) {
        return "history";
    }

    if (task.dueDate === null) {
        return "someday";
    }

    const today = getLocalDate();
    const tomorrow = getRelativeDate(1);

    if (task.dueDate < today) {
        return "overdue";
    }

    if (task.dueDate === today) {
        return "today";
    }

    if (task.dueDate === tomorrow) {
        return "tomorrow";
    }

    // 모레 이후 일정은 예정 탭에서 확인
    return "upcoming";
}

function getTasksByView(view) {
    if (view === "tomorrow") {
        // Tomorrow 탭에는 내일 및 이후 예정일 표시
        return tasks.filter(task => {
            if (task.completed || task.dueDate === null) {
                return false;
            }

            return task.dueDate > getLocalDate();
        });
    }

    return tasks.filter(task =>
        getTaskView(task) === view
    );
}

function getFilteredTasks() {
    let filtered = getTasksByView(currentView);

    if (currentCategory !== "All") {
        filtered = filtered.filter(
            task => task.category === currentCategory
        );
    }

    return filtered.sort(compareTasks);
}

function compareTasks(a, b) {
    if (currentView === "history") {
        return (b.completedAt || "").localeCompare(
            a.completedAt || ""
        );
    }

    if (a.completed !== b.completed) {
        return Number(a.completed) - Number(b.completed);
    }

    // 미래 일정은 날짜순
    if (
        currentView === "tomorrow" &&
        a.dueDate !== b.dueDate
    ) {
        return a.dueDate.localeCompare(b.dueDate);
    }

    const aPriority = PRIORITY_ORDER[a.priority] ?? 2;
    const bPriority = PRIORITY_ORDER[b.priority] ?? 2;

    if (aPriority !== bPriority) {
        return aPriority - bPriority;
    }

    return (a.createdAt || "").localeCompare(
        b.createdAt || ""
    );
}

/* ==========================================
   Task Management
========================================== */

function createTask(data) {
    const newTask = {
        id: createId(),

        title: data.title.trim(),
        category: data.category,
        priority: data.priority,

        dueDate: data.dueDate,

        completed: false,
        completedAt: null,

        createdAt: new Date().toISOString()
    };

    tasks.push(newTask);

    saveTasks();
    renderAll();

    showToast("새로운 할 일이 추가되었어요 ♡");
}

function createId() {
    if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
    ) {
        return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function updateTask(id, data) {
    const task = tasks.find(task => task.id === id);

    if (!task) {
        return;
    }

    task.title = data.title.trim();
    task.category = data.category;
    task.priority = data.priority;
    task.dueDate = data.dueDate;

    saveTasks();
    renderAll();

    showToast("할 일이 수정되었어요 ♡");
}

function deleteTask(id) {
    tasks = tasks.filter(task => task.id !== id);

    saveTasks();
    renderAll();

    showToast("할 일이 삭제되었어요.");
}

function toggleTask(id) {
    const task = tasks.find(task => task.id === id);

    if (!task) {
        return;
    }

    task.completed = !task.completed;

    task.completedAt = task.completed
        ? new Date().toISOString()
        : null;

    saveTasks();
    renderAll();

    if (task.completed) {
        showToast("작은 목표 하나를 달성했어요 ♡");
    }
}

/* ==========================================
   Progress
========================================== */

function renderProgress() {
    const today = getLocalDate();

    const todayTasks = tasks.filter(
        task => task.dueDate === today
    );

    const total = todayTasks.length;

    const completed = todayTasks.filter(
        task => task.completed
    ).length;

    const percent = total === 0
        ? 0
        : Math.round((completed / total) * 100);

    elements.progressCount.textContent =
        `${completed} / ${total}`;

    elements.progressFill.style.width = `${percent}%`;

    elements.progressTrack.setAttribute(
        "aria-valuenow",
        String(percent)
    );

    if (total === 0) {
        elements.progressText.textContent =
            "오늘도 작은 것부터 시작해 봐요 ♡";

    } else if (percent === 100) {
        elements.progressText.textContent =
            "오늘의 할 일을 모두 완료했어요! ♡";

    } else {
        elements.progressText.textContent =
            `${percent}% completed`;
    }
}

/* ==========================================
   Summary
========================================== */

function formatCount(number) {
    return String(number).padStart(2, "0");
}

function renderSummary() {
    const today = getLocalDate();

    const todayCount = tasks.filter(
        task => !task.completed && task.dueDate === today
    ).length;

    const tomorrowCount = tasks.filter(
        task =>
            !task.completed &&
            task.dueDate !== null &&
            task.dueDate > today
    ).length;

    const somedayCount = tasks.filter(
        task => !task.completed && task.dueDate === null
    ).length;

    const overdueCount = tasks.filter(
        task =>
            !task.completed &&
            task.dueDate !== null &&
            task.dueDate < today
    ).length;

    elements.todayCount.textContent =
        formatCount(todayCount);

    elements.tomorrowCount.textContent =
        formatCount(tomorrowCount);

    elements.somedayCount.textContent =
        formatCount(somedayCount);

    elements.overdueCount.textContent =
        overdueCount;
}

/* ==========================================
   Category Filters
========================================== */

function renderCategoryFilters() {
    elements.categoryFilters.replaceChildren();

    const categories = ["All", ...CATEGORIES];

    categories.forEach(category => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "filter-btn";

        button.textContent = category;

        if (currentCategory === category) {
            button.classList.add("active");
        }

        button.addEventListener("click", () => {
            currentCategory = category;

            renderCategoryFilters();
            renderTasks();
        });

        elements.categoryFilters.appendChild(button);
    });
}

/* ==========================================
   Task Rendering
========================================== */

function renderTasks() {
    const filteredTasks = getFilteredTasks();

    elements.taskList.replaceChildren();

    elements.taskCounter.textContent =
        `${filteredTasks.length} tasks`;

    elements.emptyState.hidden =
        filteredTasks.length > 0;

    if (filteredTasks.length === 0) {
        elements.emptyMessage.textContent =
            getEmptyMessage();
    }

    filteredTasks.forEach(task => {
        elements.taskList.appendChild(
            createTaskElement(task)
        );
    });
}

function createTaskElement(task) {
    const item = document.createElement("div");

    item.className = "task-item";

    if (task.completed) {
        item.classList.add("completed");
    }

    // Checkbox
    const checkbox = document.createElement("input");

    checkbox.type = "checkbox";
    checkbox.className = "task-check";
    checkbox.checked = Boolean(task.completed);

    checkbox.setAttribute(
        "aria-label",
        `${task.title} 완료 상태 변경`
    );

    checkbox.addEventListener("change", () => {
        toggleTask(task.id);
    });

    // Content
    const content = document.createElement("div");
    content.className = "task-content";

    const title = document.createElement("div");
    title.className = "task-title";
    title.textContent = task.title;

    const meta = document.createElement("div");
    meta.className = "task-meta";

    // Category
    const category = document.createElement("span");

    category.className = "category-badge";
    category.textContent = task.category;

    meta.appendChild(category);

    // Priority
    if (task.priority !== "low") {
        const priority = document.createElement("span");

        priority.className =
            `priority-badge priority-${task.priority}`;

        priority.textContent =
            task.priority === "high"
                ? "High"
                : "Medium";

        meta.appendChild(priority);
    }

    // Due Date
    if (task.dueDate) {
        const date = document.createElement("span");

        date.className = "task-date";
        date.textContent = formatDate(task.dueDate);

        meta.appendChild(date);
    }

    content.appendChild(title);
    content.appendChild(meta);

    // Actions
    const actions = document.createElement("div");
    actions.className = "task-actions";

    const editButton = document.createElement("button");

    editButton.type = "button";
    editButton.className = "icon-button";
    editButton.textContent = "✎";
    editButton.title = "수정";
    editButton.setAttribute("aria-label", "할 일 수정");

    editButton.addEventListener("click", () => {
        openEditModal(task.id);
    });

    const deleteButton = document.createElement("button");

    deleteButton.type = "button";
    deleteButton.className = "icon-button delete";
    deleteButton.textContent = "×";
    deleteButton.title = "삭제";
    deleteButton.setAttribute("aria-label", "할 일 삭제");

    deleteButton.addEventListener("click", () => {
        deleteTask(task.id);
    });

    actions.appendChild(editButton);
    actions.appendChild(deleteButton);

    item.appendChild(checkbox);
    item.appendChild(content);
    item.appendChild(actions);

    return item;
}

function getEmptyMessage() {
    switch (currentView) {
        case "today":
            return "오늘의 할 일이 아직 없어요 ♡";

        case "tomorrow":
            return "예정된 할 일이 없어요 ♡";

        case "someday":
            return "Someday 보관함이 비어 있어요 ♡";

        case "overdue":
            return "밀린 할 일이 없어요. 좋아요! ♡";

        case "history":
            return "완료한 할 일이 아직 없어요 ♡";

        default:
            return "등록된 할 일이 없어요.";
    }
}

/* ==========================================
   View Navigation
========================================== */

function changeView(view) {
    currentView = view;
    currentCategory = "All";

    renderNavigation();
    renderSection();
    renderCategoryFilters();
    renderTasks();
}

function renderNavigation() {
    document.querySelectorAll("[data-view]")
        .forEach(button => {
            const isActive =
                button.dataset.view === currentView;

            button.classList.toggle("active", isActive);

            button.setAttribute(
                "aria-pressed",
                String(isActive)
            );
        });
}

function renderSection() {
    elements.sectionTitle.textContent =
        VIEW_LABELS[currentView];

    elements.sectionEyebrow.textContent =
        currentView === "history"
            ? "LITTLE ACHIEVEMENTS"
            : "YOUR LITTLE STEPS";

    // History에서는 추가 버튼 숨김
    elements.openAddButton.hidden =
        currentView === "history";
}

/* ==========================================
   Modal
========================================== */

function openAddModal() {
    editingTaskId = null;

    elements.taskForm.reset();
    elements.modalTitle.textContent = "New Task ♡";

    elements.taskPriority.value = "medium";

    // 현재 탭에 맞춰 기본 일정 선택
    switch (currentView) {
        case "tomorrow":
            elements.taskSchedule.value = "tomorrow";
            break;

        case "someday":
            elements.taskSchedule.value = "someday";
            break;

        case "overdue":
            elements.taskSchedule.value = "today";
            break;

        default:
            elements.taskSchedule.value = "today";
    }

    elements.customDateGroup.hidden = true;

    showModal();
}

function openEditModal(id) {
    const task = tasks.find(task => task.id === id);

    if (!task) {
        return;
    }

    editingTaskId = id;

    elements.modalTitle.textContent = "Edit Task ♡";

    elements.taskTitle.value = task.title;
    elements.taskCategory.value = task.category;
    elements.taskPriority.value = task.priority;

    const today = getLocalDate();
    const tomorrow = getRelativeDate(1);

    if (task.dueDate === null) {
        elements.taskSchedule.value = "someday";

    } else if (task.dueDate === today) {
        elements.taskSchedule.value = "today";

    } else if (task.dueDate === tomorrow) {
        elements.taskSchedule.value = "tomorrow";

    } else {
        elements.taskSchedule.value = "custom";
    }

    elements.taskDueDate.value = task.dueDate || "";

    updateCustomDateVisibility();
    showModal();
}

function showModal() {
    elements.taskModal.hidden = false;

    // iframe에서도 입력창에 포커스
    requestAnimationFrame(() => {
        elements.taskTitle.focus();
    });
}

function closeModal() {
    elements.taskModal.hidden = true;

    editingTaskId = null;
    elements.taskForm.reset();
}

function updateCustomDateVisibility() {
    const isCustom =
        elements.taskSchedule.value === "custom";

    elements.customDateGroup.hidden = !isCustom;

    elements.taskDueDate.required = isCustom;

    if (isCustom && !elements.taskDueDate.value) {
        elements.taskDueDate.value = getLocalDate();
    }
}

function resolveDueDate() {
    const schedule = elements.taskSchedule.value;

    switch (schedule) {
        case "today":
            return getLocalDate();

        case "tomorrow":
            return getRelativeDate(1);

        case "someday":
            return null;

        case "custom":
            return elements.taskDueDate.value;

        default:
            return getLocalDate();
    }
}

function handleTaskSubmit(event) {
    event.preventDefault();

    const title = elements.taskTitle.value.trim();

    if (!title) {
        return;
    }

    const dueDate = resolveDueDate();

    if (
        elements.taskSchedule.value === "custom" &&
        !dueDate
    ) {
        return;
    }

    const data = {
        title,
        category: elements.taskCategory.value,
        priority: elements.taskPriority.value,
        dueDate
    };

    if (editingTaskId) {
        updateTask(editingTaskId, data);
    } else {
        createTask(data);
    }

    closeModal();
}

/* ==========================================
   Toast
========================================== */

function showToast(message) {
    clearTimeout(toastTimer);

    elements.toast.textContent = message;
    elements.toast.classList.add("show");

    toastTimer = setTimeout(() => {
        elements.toast.classList.remove("show");
    }, 2200);
}

/* ==========================================
   Render All
========================================== */

function renderAll() {
    renderCurrentDate();
    renderProgress();
    renderSummary();

    renderNavigation();
    renderSection();

    renderCategoryFilters();
    renderTasks();
}

/* ==========================================
   Event Listeners
========================================== */

function initializeEvents() {
    // Summary + extra tabs
    document.querySelectorAll("[data-view]")
        .forEach(button => {
            button.addEventListener("click", () => {
                changeView(button.dataset.view);
            });
        });

    // Add task
    elements.openAddButton.addEventListener(
        "click",
        openAddModal
    );

    // Form
    elements.taskForm.addEventListener(
        "submit",
        handleTaskSubmit
    );

    // Schedule selection
    elements.taskSchedule.addEventListener(
        "change",
        updateCustomDateVisibility
    );

    // Close modal
    elements.closeModalButton.addEventListener(
        "click",
        closeModal
    );

    elements.cancelButton.addEventListener(
        "click",
        closeModal
    );

    // Backdrop click
    elements.taskModal.addEventListener(
        "click",
        event => {
            if (event.target === elements.taskModal) {
                closeModal();
            }
        }
    );

    // Escape
    document.addEventListener("keydown", event => {
        if (
            event.key === "Escape" &&
            !elements.taskModal.hidden
        ) {
            closeModal();
        }
    });

    // 다른 탭에서 데이터 변경 시 동기화
    window.addEventListener("storage", event => {
        if (event.key === STORAGE_KEY) {
            tasks = loadTasks();
            renderAll();
        }
    });

    // 브라우저 탭으로 돌아왔을 때 갱신
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
            refreshDateIfNeeded();
        }
    });

    window.addEventListener("focus", refreshDateIfNeeded);
}

/* ==========================================
   Date Change Handling
========================================== */

function refreshDateIfNeeded() {
    const today = getLocalDate();

    if (today !== lastRenderedDate) {
        lastRenderedDate = today;

        renderAll();
    }
}

// 날짜가 바뀌었는지 주기적으로 확인
// 기존 데이터는 그대로 유지하고 날짜별 목록만 재분류

function startDateWatcher() {
    setInterval(() => {
        refreshDateIfNeeded();
    }, 60000);
}

/* ==========================================
   Initialize
========================================== */

function init() {
    initializeEvents();

    renderAll();

    startDateWatcher();
}

init();