
"use strict";

/* ========================================
   1. Settings
======================================== */

const STORAGE_KEY = "notion-dday-tracker-v1";

const DEFAULT_TEXT_COLOR = "#333333";
const DEFAULT_BG_COLOR = "#F7F7F7";

const $ = (id) => document.getElementById(id);

const elements = {
    addBtn: $("add-event-btn"),
    togglePastBtn: $("toggle-past-btn"),

    grid: $("events-grid"),
    empty: $("empty-state"),

    editor: $("editor-panel"),
    editorTitle: $("editor-title"),
    closeBtn: $("close-editor-btn"),
    cancelBtn: $("cancel-editor-btn"),

    form: $("event-form"),
    name: $("event-name"),
    date: $("event-date"),
    note: $("event-note"),

    textColor: $("event-text-color"),
    bgColor: $("event-bg-color"),
    textSwatch: $("text-color-swatch"),
    bgSwatch: $("bg-color-swatch"),

    preview: $("event-preview"),
    previewName: $("preview-name"),
    previewDday: $("preview-dday"),
    previewDate: $("preview-date"),

    deleteBtn: $("delete-event-btn"),
    error: $("form-error")
};

let state = loadState();
let editingId = null;
let deletePending = false;

/* ========================================
   2. Date Utilities
======================================== */

function getTodayString() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function isValidDate(value) {
    if (
        typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        return false;
    }

    const [year, month, day] = value.split("-").map(Number);

    if (year < 1 || year > 9999) return false;

    const date = new Date(0);
    date.setFullYear(year, month - 1, day);
    date.setHours(12, 0, 0, 0);

    return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
    );
}

function toDayNumber(value) {
    const [year, month, day] = value.split("-").map(Number);

    const date = new Date(0);
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCFullYear(year, month - 1, day);

    return Math.round(date.getTime() / 86400000);
}

function getDayDifference(dateString) {
    return (
        toDayNumber(dateString) -
        toDayNumber(getTodayString())
    );
}

function formatDday(dateString) {
    const diff = getDayDifference(dateString);

    if (diff === 0) return "D-Day";
    if (diff > 0) return `D-${diff}`;

    return `D+${Math.abs(diff)}`;
}

function formatDate(dateString) {
    const [year, month, day] = dateString.split("-").map(Number);

    const date = new Date(0);
    date.setFullYear(year, month - 1, day);
    date.setHours(12, 0, 0, 0);

    const weekdays = [
        "SUN", "MON", "TUE", "WED",
        "THU", "FRI", "SAT"
    ];

    return (
        `${year}.` +
        `${String(month).padStart(2, "0")}.` +
        `${String(day).padStart(2, "0")} ` +
        weekdays[date.getDay()]
    );
}

/* ========================================
   3. Colors
======================================== */

function normalizeColor(value, fallback) {
    if (typeof value !== "string") return fallback;

    const color = value.trim();

    if (/^#[0-9a-fA-F]{6}$/.test(color)) {
        return color.toUpperCase();
    }

    return fallback;
}

function isValidColor(value) {
    return /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

/* ========================================
   4. Storage
======================================== */

function createId() {
    if (window.crypto && crypto.randomUUID) {
        return crypto.randomUUID();
    }

    return (
        Date.now().toString(36) +
        "-" +
        Math.random().toString(36).slice(2)
    );
}

function loadState() {
    const fallback = {
        events: [],
        showPast: false
    };

    try {
        const raw = localStorage.getItem(STORAGE_KEY);

        if (!raw) return fallback;

        const parsed = JSON.parse(raw);

        if (!parsed || typeof parsed !== "object") {
            return fallback;
        }

        const rawEvents = Array.isArray(parsed.events)
            ? parsed.events
            : [];

        const usedIds = new Set();

        const events = rawEvents
            .filter(event => (
                event &&
                typeof event.name === "string" &&
                event.name.trim().length > 0 &&
                isValidDate(event.date)
            ))
            .map((event, index) => {
                let id = (
                    typeof event.id === "string" &&
                    event.id.length > 0
                ) ? event.id : createId();

                if (usedIds.has(id)) {
                    id = createId();
                }

                usedIds.add(id);

                return {
                    id,
                    name: event.name.trim().slice(0, 100),
                    date: event.date,
                    note: typeof event.note === "string"
                        ? event.note.slice(0, 300)
                        : "",

                    textColor: normalizeColor(
                        event.textColor,
                        DEFAULT_TEXT_COLOR
                    ),

                    bgColor: normalizeColor(
                        event.bgColor,
                        DEFAULT_BG_COLOR
                    ),

                    order: Number.isSafeInteger(event.order)
                        ? event.order
                        : index
                };
            });

        return {
            events,
            showPast: parsed.showPast === true
        };

    } catch (error) {
        console.warn("Could not load events:", error);
        return fallback;
    }
}

function saveState() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(state)
        );

        return true;

    } catch (error) {
        console.warn("Could not save events:", error);
        return false;
    }
}

/* ========================================
   5. Event Grid
======================================== */

function getSortedEvents() {
    return [...state.events].sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);

        if (dateCompare !== 0) return dateCompare;

        return a.order - b.order;
    });
}

function createEventCard(event) {
    const card = document.createElement("button");

    card.type = "button";
    card.className = "event-card";

    card.style.setProperty(
        "--card-bg",
        event.bgColor
    );

    card.style.setProperty(
        "--card-text",
        event.textColor
    );

    if (getDayDifference(event.date) < 0) {
        card.classList.add("is-past");
    }

    const name = document.createElement("span");
    name.className = "event-name";
    name.textContent = event.name;

    const dday = document.createElement("strong");
    dday.className = "event-dday";
    dday.textContent = formatDday(event.date);

    const date = document.createElement("span");
    date.className = "event-date";
    date.textContent = formatDate(event.date);

    card.append(name, dday, date);

    card.setAttribute(
        "aria-label",
        `${event.name}, ${formatDday(event.date)}, 편집하기`
    );

    // 카드를 클릭하면 편집창 열기
    card.addEventListener("click", () => {
        openEditor(event.id);
    });

    return card;
}

function renderEvents() {
    elements.grid.replaceChildren();

    const events = getSortedEvents().filter(event => {
        if (state.showPast) return true;

        return getDayDifference(event.date) >= 0;
    });

    events.forEach(event => {
        elements.grid.appendChild(
            createEventCard(event)
        );
    });

    const isEmpty = events.length === 0;

    elements.empty.hidden = !isEmpty;
    elements.grid.hidden = isEmpty;

    elements.togglePastBtn.textContent = state.showPast
        ? "Hide Past"
        : "Show Past";

    if (isEmpty) {
        const emptyTitle = elements.empty.querySelector("p");
        const emptyText = elements.empty.querySelector("span");

        if (state.events.length === 0) {
            emptyTitle.textContent = "No events yet";
            emptyText.textContent =
                "Click + to add your first event.";
        } else {
            emptyTitle.textContent = "No upcoming events";
            emptyText.textContent =
                "Select Show Past to view previous events.";
        }
    }
}

/* ========================================
   6. Editor
======================================== */

function resetDeleteButton() {
    deletePending = false;
    elements.deleteBtn.textContent = "Delete";
}

function openEditor(id = null) {
    editingId = id;
    resetDeleteButton();

    elements.error.textContent = "";

    const event = state.events.find(
        item => item.id === id
    );

    elements.form.reset();

    if (event) {
        elements.editorTitle.textContent = "Edit Event";

        elements.name.value = event.name;
        elements.date.value = event.date;
        elements.note.value = event.note || "";

        elements.textColor.value = event.textColor;
        elements.bgColor.value = event.bgColor;

        elements.deleteBtn.hidden = false;

    } else {
        elements.editorTitle.textContent = "Add Event";

        elements.name.value = "";
        elements.date.value = getTodayString();
        elements.note.value = "";

        elements.textColor.value = DEFAULT_TEXT_COLOR;
        elements.bgColor.value = DEFAULT_BG_COLOR;

        elements.deleteBtn.hidden = true;
    }

    elements.editor.hidden = false;

    updatePreview();

    elements.name.focus();
    elements.editor.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });
}

function closeEditor() {
    elements.editor.hidden = true;
    editingId = null;

    elements.error.textContent = "";
    resetDeleteButton();
}

/* ========================================
   7. Live Preview
======================================== */

function updatePreview() {
    const name = elements.name.value.trim();
    const date = elements.date.value;

    const textColor = normalizeColor(
        elements.textColor.value,
        DEFAULT_TEXT_COLOR
    );

    const bgColor = normalizeColor(
        elements.bgColor.value,
        DEFAULT_BG_COLOR
    );

    elements.preview.style.backgroundColor = bgColor;
    elements.preview.style.color = textColor;

    elements.textSwatch.style.backgroundColor = textColor;
    elements.bgSwatch.style.backgroundColor = bgColor;

    elements.previewName.textContent =
        name || "Event Name";

    if (isValidDate(date)) {
        elements.previewDday.textContent = formatDday(date);
        elements.previewDate.textContent = formatDate(date);
    } else {
        elements.previewDday.textContent = "D-20";
        elements.previewDate.textContent = "YYYY.MM.DD";
    }
}

/* ========================================
   8. Save Event
======================================== */

function saveEvent(event) {
    event.preventDefault();

    const name = elements.name.value.trim();
    const date = elements.date.value;
    const note = elements.note.value.trim();

    const textColorInput = elements.textColor.value.trim();
    const bgColorInput = elements.bgColor.value.trim();

    if (!name) {
        elements.error.textContent =
            "Please enter an event name.";
        return;
    }

    if (!isValidDate(date)) {
        elements.error.textContent =
            "Please select a valid date.";
        return;
    }

    if (!isValidColor(textColorInput)) {
        elements.error.textContent =
            "Text Color must be a 6-digit HEX code.";
        return;
    }

    if (!isValidColor(bgColorInput)) {
        elements.error.textContent =
            "Background Color must be a 6-digit HEX code.";
        return;
    }

    const textColor = textColorInput.toUpperCase();
    const bgColor = bgColorInput.toUpperCase();

    const previousState = JSON.stringify(state);

    if (editingId) {
        const existing = state.events.find(
            item => item.id === editingId
        );

        if (!existing) return;

        existing.name = name;
        existing.date = date;
        existing.note = note;
        existing.textColor = textColor;
        existing.bgColor = bgColor;

    } else {
        const maxOrder = state.events.reduce(
            (max, item) => Math.max(max, item.order),
            -1
        );

        state.events.push({
            id: createId(),
            name,
            date,
            note,
            textColor,
            bgColor,
            order: maxOrder + 1
        });
    }

    if (!saveState()) {
        state = JSON.parse(previousState);
        elements.error.textContent =
            "Could not save. Please check browser storage.";
        return;
    }

    closeEditor();
    renderEvents();
}

/* ========================================
   9. Delete Event
======================================== */

function deleteEvent() {
    if (!editingId) return;

    // 첫 클릭: 삭제 확인
    if (!deletePending) {
        deletePending = true;
        elements.deleteBtn.textContent = "Confirm Delete";

        elements.error.textContent =
            "Click Confirm Delete to remove this event.";

        return;
    }

    // 두 번째 클릭: 실제 삭제
    const previousState = JSON.stringify(state);

    state.events = state.events.filter(
        event => event.id !== editingId
    );

    if (!saveState()) {
        state = JSON.parse(previousState);
        elements.error.textContent =
            "Could not delete. Please try again.";
        resetDeleteButton();
        return;
    }

    closeEditor();
    renderEvents();
}

/* ========================================
   10. Event Listeners
======================================== */

elements.addBtn.addEventListener("click", () => {
    openEditor();
});

elements.closeBtn.addEventListener("click", closeEditor);
elements.cancelBtn.addEventListener("click", closeEditor);

elements.form.addEventListener("submit", saveEvent);

elements.deleteBtn.addEventListener("click", deleteEvent);

elements.togglePastBtn.addEventListener("click", () => {
    const previousValue = state.showPast;

    state.showPast = !state.showPast;

    if (!saveState()) {
        state.showPast = previousValue;
    }

    renderEvents();
});

[
    elements.name,
    elements.date,
    elements.textColor,
    elements.bgColor
].forEach(input => {
    input.addEventListener("input", updatePreview);
    input.addEventListener("change", updatePreview);
});

// 다른 탭에서 데이터가 변경되었을 때 동기화
window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) {
        state = loadState();
        closeEditor();
        renderEvents();
    }
});

// 날짜가 바뀌면 D-Day 자동 갱신
let lastToday = getTodayString();

setInterval(() => {
    const currentToday = getTodayString();

    if (currentToday !== lastToday) {
        lastToday = currentToday;

        renderEvents();

        if (!elements.editor.hidden) {
            updatePreview();
        }
    }
}, 60 * 1000);

// 초기 화면
renderEvents();
