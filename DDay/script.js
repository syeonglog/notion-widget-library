
"use strict";

/* =========================================
   1. Constants & Default State
========================================= */

const STORAGE_KEY = "notion-dday-tracker-v1";

const DEFAULT_STATE = {
    events: [],
    selectedId: null,
    showPast: false
};

const $ = (id) => document.getElementById(id);

const elements = {
    addButton: $("add-event-btn"),

    mainEmpty: $("main-empty"),
    mainContent: $("main-content"),
    mainName: $("main-event-name"),
    mainDday: $("main-dday"),
    mainDate: $("main-event-date"),
    mainNote: $("main-event-note"),

    editor: $("editor-panel"),
    editorTitle: $("editor-title"),
    closeEditor: $("close-editor-btn"),
    cancelEditor: $("cancel-editor-btn"),
    form: $("event-form"),
    nameInput: $("event-name"),
    dateInput: $("event-date"),
    noteInput: $("event-note"),
    formError: $("form-error"),
    saveButton: $("save-event-btn"),

    eventsList: $("events-list"),
    listEmpty: $("list-empty"),
    eventCount: $("event-count"),
    togglePast: $("toggle-past-btn"),

    liveStatus: $("live-status")
};

let state = loadState();

// Null means Add mode.
// Otherwise it contains the event ID being edited.
let editingId = null;

// Remember which button opened the editor.
let editorReturnFocus = null;

// Used to detect local calendar date changes.
let lastKnownDate = getLocalToday();


/* =========================================
   2. Date Utilities
========================================= */

/**
 * Return local calendar date as YYYY-MM-DD.
 * Avoid toISOString() because it uses UTC.
 */
function getLocalToday() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(
        now.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        now.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

/**
 * Validate an actual calendar date.
 * Invalid dates such as February 30 are rejected.
 */
function isValidDate(dateString) {
    if (
        typeof dateString !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(dateString)
    ) {
        return false;
    }

    const [year, month, day] =
        dateString.split("-").map(Number);

    if (
        year < 1 ||
        year > 9999 ||
        month < 1 ||
        month > 12 ||
        day < 1 ||
        day > 31
    ) {
        return false;
    }

    const date = new Date(0);

    date.setFullYear(year, month - 1, day);
    date.setHours(12, 0, 0, 0);

    return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
    );
}

/**
 * Convert a calendar date to a UTC day number.
 *
 * UTC is used only for date arithmetic.
 * The user's local date is obtained separately.
 *
 * This prevents DST-related 23/25-hour errors.
 */
function dateToDayNumber(dateString) {
    const [year, month, day] =
        dateString.split("-").map(Number);

    const date = new Date(0);

    date.setUTCHours(0, 0, 0, 0);
    date.setUTCFullYear(year, month - 1, day);

    return Math.round(
        date.getTime() / 86400000
    );
}

/**
 * Return signed calendar-day difference.
 *
 * Positive = future
 * Zero     = today
 * Negative = past
 */
function getDayDifference(targetDate) {
    const today = getLocalToday();

    return (
        dateToDayNumber(targetDate) -
        dateToDayNumber(today)
    );
}

/**
 * Format D-Day label.
 */
function getDdayLabel(dateString) {
    const diff = getDayDifference(dateString);

    if (diff === 0) {
        return "D-Day";
    }

    if (diff > 0) {
        return `D-${diff}`;
    }

    return `D+${Math.abs(diff)}`;
}

/**
 * Format target date for main card.
 * Example: 2026.11.09 MON
 */
function formatMainDate(dateString) {
    const [year, month, day] =
        dateString.split("-").map(Number);

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

/**
 * Format list date.
 * Example: 2026.10.28
 */
function formatListDate(dateString) {
    return dateString.replaceAll("-", ".");
}


/* =========================================
   3. ID Generation
========================================= */

function createId() {
    if (
        window.crypto &&
        typeof crypto.randomUUID === "function"
    ) {
        return crypto.randomUUID();
    }

    return (
        "event-" +
        Date.now() +
        "-" +
        Math.random().toString(36).slice(2)
    );
}


/* =========================================
   4. Local Storage
========================================= */

/**
 * Safely restore saved state.
 * Malformed event records are ignored.
 */
function loadState() {
    const fallback = {
        ...DEFAULT_STATE,
        events: []
    };

    try {
        const raw = localStorage.getItem(STORAGE_KEY);

        if (!raw) {
            return fallback;
        }

        const parsed = JSON.parse(raw);

        if (
            !parsed ||
            typeof parsed !== "object" ||
            Array.isArray(parsed)
        ) {
            return fallback;
        }

        const rawEvents = Array.isArray(parsed.events)
            ? parsed.events
            : [];

        const usedIds = new Set();

        const events = rawEvents
            .filter((event) => {
                return (
                    event &&
                    typeof event === "object" &&
                    typeof event.id === "string" &&
                    event.id.length > 0 &&
                    typeof event.name === "string" &&
                    event.name.trim().length > 0 &&
                    event.name.trim().length <= 100 &&
                    isValidDate(event.date)
                );
            })
            .map((event, index) => {
                let id = event.id;

                if (usedIds.has(id)) {
                    id = createId();
                }

                usedIds.add(id);

                return {
                    id,
                    name: event.name.trim(),
                    date: event.date,

                    note: typeof event.note === "string"
                        ? event.note.slice(0, 300)
                        : "",

                    createdAt:
                        Number.isFinite(event.createdAt)
                            ? event.createdAt
                            : index,

                    updatedAt:
                        Number.isFinite(event.updatedAt)
                            ? event.updatedAt
                            : null,

                    order:
                        Number.isSafeInteger(event.order) &&
                        event.order >= 0
                            ? event.order
                            : index
                };
            });

        return {
            events,

            selectedId:
                typeof parsed.selectedId === "string"
                    ? parsed.selectedId
                    : null,

            showPast:
                parsed.showPast === true
        };

    } catch (error) {
        console.warn(
            "Could not load D-Day data:",
            error
        );

        return fallback;
    }
}

/**
 * Persist the complete application state.
 */
function saveState() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(state)
        );

        return true;

    } catch (error) {
        console.warn(
            "Could not save D-Day data:",
            error
        );

        announce(
            "Unable to save changes in this browser."
        );

        return false;
    }
}


/* =========================================
   5. Event Sorting
========================================= */

/**
 * Sorting rules:
 *
 * 1. Today
 * 2. Future, nearest first
 * 3. Past, most recent first
 * 4. Same date: registration order
 */
function sortEvents(events) {
    const today = getLocalToday();

    return [...events].sort((a, b) => {
        const aPast = a.date < today;
        const bPast = b.date < today;

        if (aPast !== bPast) {
            return aPast ? 1 : -1;
        }

        if (a.date !== b.date) {
            if (aPast && bPast) {
                return b.date.localeCompare(a.date);
            }

            return a.date.localeCompare(b.date);
        }

        return (
            a.order - b.order ||
            a.createdAt - b.createdAt ||
            a.id.localeCompare(b.id)
        );
    });
}


/* =========================================
   6. Main Event Selection
========================================= */

/**
 * Find the automatic default event.
 *
 * Because sortEvents() places upcoming events
 * first and recent past events afterward,
 * the first item is always the default.
 */
function getAutomaticEvent() {
    return sortEvents(state.events)[0] || null;
}

/**
 * Return currently selected event.
 *
 * If selection is invalid, choose the
 * closest upcoming event automatically.
 */
function getSelectedEvent() {
    const selected = state.events.find(
        event => event.id === state.selectedId
    );

    if (selected) {
        return selected;
    }

    return getAutomaticEvent();
}

/**
 * Normalize the selected ID.
 *
 * A valid manual selection is always retained,
 * including when the calendar date changes.
 */
function ensureSelection() {
    const selected = state.events.find(
        event => event.id === state.selectedId
    );

    if (selected) {
        return false;
    }

    const automatic = getAutomaticEvent();

    const nextId = automatic
        ? automatic.id
        : null;

    if (state.selectedId !== nextId) {
        state.selectedId = nextId;
        return true;
    }

    return false;
}

/**
 * Select an event from the list.
 */
function selectEvent(id) {
    const event = state.events.find(
        item => item.id === id
    );

    if (!event) {
        return;
    }

    state.selectedId = id;

    saveState();
    render();

    announce(`${event.name} selected.`);
}


/* =========================================
   7. Add / Edit Panel
========================================= */

function clearFormError() {
    elements.formError.textContent = "";
    elements.formError.classList.add("hidden");
}

function showFormError(message) {
    elements.formError.textContent = message;
    elements.formError.classList.remove("hidden");
}

/**
 * Open inline editor.
 *
 * eventId = null -> Add
 * eventId set  -> Edit
 */
function openEditor(eventId = null) {
    editingId = eventId;

    const event = eventId
        ? state.events.find(item => item.id === eventId)
        : null;

    if (eventId && !event) {
        return;
    }

    editorReturnFocus = document.activeElement;

    elements.form.reset();
    clearFormError();

    if (event) {
        elements.editorTitle.textContent = "Edit Event";
        elements.saveButton.textContent = "Save Changes";

        elements.nameInput.value = event.name;
        elements.dateInput.value = event.date;
        elements.noteInput.value = event.note;

    } else {
        elements.editorTitle.textContent = "Add Event";
        elements.saveButton.textContent = "Save Event";

        elements.nameInput.value = "";
        elements.dateInput.value = getLocalToday();
        elements.noteInput.value = "";
    }

    elements.editor.classList.remove("hidden");

    elements.nameInput.focus();

    elements.editor.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });
}

/**
 * Close the inline editor.
 */
function closeEditor() {
    elements.editor.classList.add("hidden");

    editingId = null;
    clearFormError();

    if (
        editorReturnFocus &&
        editorReturnFocus.isConnected
    ) {
        editorReturnFocus.focus();
    }

    editorReturnFocus = null;
}


/* =========================================
   8. Form Validation & Save
========================================= */

function validateForm() {
    const name = elements.nameInput.value.trim();
    const date = elements.dateInput.value;
    const note = elements.noteInput.value.trim();

    if (!name) {
        showFormError("Please enter an event name.");
        elements.nameInput.focus();
        return null;
    }

    if (name.length > 100) {
        showFormError(
            "Event name must be 100 characters or less."
        );

        elements.nameInput.focus();
        return null;
    }

    if (!isValidDate(date)) {
        showFormError("Please select a valid date.");
        elements.dateInput.focus();
        return null;
    }

    if (note.length > 300) {
        showFormError(
            "Memo must be 300 characters or less."
        );

        elements.noteInput.focus();
        return null;
    }

    clearFormError();

    return {
        name,
        date,
        note
    };
}

/**
 * Add or update an event.
 */
function handleFormSubmit(event) {
    event.preventDefault();

    const data = validateForm();

    if (!data) {
        return;
    }

    const now = Date.now();

    if (editingId) {
        const existing = state.events.find(
            item => item.id === editingId
        );

        if (!existing) {
            showFormError(
                "This event no longer exists."
            );
            return;
        }

        existing.name = data.name;
        existing.date = data.date;
        existing.note = data.note;
        existing.updatedAt = now;

        announce("Event updated.");

    } else {
        const maxOrder = state.events.reduce(
            (max, item) => Math.max(max, item.order),
            -1
        );

        const newEvent = {
            id: createId(),
            name: data.name,
            date: data.date,
            note: data.note,
            createdAt: now,
            updatedAt: null,
            order: maxOrder + 1
        };

        state.events.push(newEvent);

        announce("Event added.");
    }

    ensureSelection();
    saveState();

    closeEditor();
    render();
}


/* =========================================
   9. Delete Event
========================================= */

/**
 * Delete immediately without alert/confirm.
 *
 * If the selected event is removed,
 * ensureSelection() chooses the next
 * closest event automatically.
 */
function deleteEvent(id) {
    const index = state.events.findIndex(
        event => event.id === id
    );

    if (index === -1) {
        return;
    }

    const deletedName = state.events[index].name;

    state.events.splice(index, 1);

    if (state.selectedId === id) {
        state.selectedId = null;
    }

    // Close editor if the edited event is deleted.
    if (editingId === id) {
        closeEditor();
    }

    ensureSelection();

    saveState();
    render();

    announce(`${deletedName} deleted.`);
}


/* =========================================
   10. DOM Utilities
========================================= */

/**
 * Create an element with safe text content.
 *
 * User-entered names and memos are never
 * inserted using innerHTML.
 */
function createElement(
    tag,
    className = "",
    text = null
) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== null) {
        element.textContent = text;
    }

    return element;
}

/**
 * Create a Lucide icon element.
 */
function createIcon(name, className = "") {
    const icon = document.createElement("i");

    icon.setAttribute("data-lucide", name);

    if (className) {
        icon.className = className;
    }

    return icon;
}

/**
 * Refresh Lucide icons if available.
 */
function refreshIcons() {
    if (
        window.lucide &&
        typeof window.lucide.createIcons === "function"
    ) {
        window.lucide.createIcons();
    }
}

/**
 * Accessibility status message.
 */
function announce(message) {
    elements.liveStatus.textContent = "";

    requestAnimationFrame(() => {
        elements.liveStatus.textContent = message;
    });
}


/* =========================================
   11. Render Main D-Day Card
========================================= */

function renderMainCard() {
    const event = getSelectedEvent();

    if (!event) {
        elements.mainEmpty.classList.remove("hidden");
        elements.mainContent.classList.add("hidden");
        return;
    }

    elements.mainEmpty.classList.add("hidden");
    elements.mainContent.classList.remove("hidden");

    elements.mainName.textContent = event.name;

    elements.mainDday.textContent =
        getDdayLabel(event.date);

    elements.mainDate.textContent =
        formatMainDate(event.date);

    if (event.note) {
        elements.mainNote.textContent = event.note;
        elements.mainNote.classList.remove("hidden");
    } else {
        elements.mainNote.textContent = "";
        elements.mainNote.classList.add("hidden");
    }
}


/* =========================================
   12. Render Event Row
========================================= */

function createEventRow(event) {
    const selected = event.id === state.selectedId;
    const past = event.date < getLocalToday();

    const row = createElement("div", "event-row");

    if (selected) {
        row.classList.add("selected");
    }

    if (past) {
        row.classList.add("past");
    }

    // Main clickable area
    const selectButton = createElement(
        "button",
        "event-select"
    );

    selectButton.type = "button";

    selectButton.setAttribute(
        "aria-label",
        `Select ${event.name}, ${getDdayLabel(event.date)}`
    );

    selectButton.setAttribute(
        "aria-pressed",
        String(selected)
    );

    const info = createElement("div", "event-info");

    const nameLine = createElement(
        "div",
        "event-name-line"
    );

    const name = createElement(
        "span",
        "event-name",
        event.name
    );

    nameLine.appendChild(name);

    if (selected) {
        nameLine.appendChild(
            createIcon("check", "selected-icon")
        );
    }

    const date = createElement(
        "span",
        "event-date",
        formatListDate(event.date)
    );

    info.append(nameLine, date);

    const dday = createElement(
        "span",
        "event-dday",
        getDdayLabel(event.date)
    );

    selectButton.append(info, dday);

    selectButton.addEventListener("click", () => {
        selectEvent(event.id);
    });

    // Edit / Delete actions
    const actions = createElement(
        "div",
        "event-actions"
    );

    const editButton = createElement(
        "button",
        "event-action"
    );

    editButton.type = "button";
    editButton.title = "Edit event";

    editButton.setAttribute(
        "aria-label",
        `Edit ${event.name}`
    );

    editButton.appendChild(createIcon("pencil"));

    editButton.addEventListener("click", (e) => {
        e.stopPropagation();
        openEditor(event.id);
    });

    const deleteButton = createElement(
        "button",
        "event-action"
    );

    deleteButton.type = "button";
    deleteButton.title = "Delete event";

    deleteButton.setAttribute(
        "aria-label",
        `Delete ${event.name}`
    );

    deleteButton.appendChild(createIcon("trash-2"));

    deleteButton.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteEvent(event.id);
    });

    actions.append(editButton, deleteButton);

    row.append(selectButton, actions);

    return row;
}


/* =========================================
   13. Render Upcoming Events
========================================= */

function renderEventList() {
    const sorted = sortEvents(state.events);
    const today = getLocalToday();

    const visibleEvents = sorted.filter(event => {
        if (state.showPast) {
            return true;
        }

        // Keep the selected event visible even
        // when it is in the past.
        return (
            event.date >= today ||
            event.id === state.selectedId
        );
    });

    elements.eventsList.replaceChildren();

    const fragment = document.createDocumentFragment();

    for (const event of visibleEvents) {
        fragment.appendChild(createEventRow(event));
    }

    elements.eventsList.appendChild(fragment);

    elements.listEmpty.classList.toggle(
        "hidden",
        visibleEvents.length > 0
    );

    elements.eventCount.textContent =
        `${state.events.length} ` +
        (state.events.length === 1 ? "EVENT" : "EVENTS");

    const pastCount = state.events.filter(
        event => event.date < today
    ).length;

    elements.togglePast.classList.toggle(
        "hidden",
        pastCount === 0
    );

    elements.togglePast.textContent =
        state.showPast ? "Hide Past" : "Show Past";

    elements.togglePast.setAttribute(
        "aria-pressed",
        String(state.showPast)
    );
}


/* =========================================
   14. Main Render Function
========================================= */

function render() {
    const selectionChanged = ensureSelection();

    if (selectionChanged) {
        saveState();
    }

    renderMainCard();
    renderEventList();

    refreshIcons();
}


/* =========================================
   15. Event Listeners
========================================= */

// Add Event
elements.addButton.addEventListener(
    "click",
    () => openEditor()
);

// Close Editor
elements.closeEditor.addEventListener(
    "click",
    closeEditor
);

// Cancel Editor
elements.cancelEditor.addEventListener(
    "click",
    closeEditor
);

// Save Event
elements.form.addEventListener(
    "submit",
    handleFormSubmit
);

// Clear validation message when typing.
elements.nameInput.addEventListener(
    "input",
    clearFormError
);

elements.dateInput.addEventListener(
    "input",
    clearFormError
);

elements.noteInput.addEventListener(
    "input",
    clearFormError
);

// Show / Hide Past Events
elements.togglePast.addEventListener(
    "click",
    () => {
        state.showPast = !state.showPast;

        saveState();
        render();
    }
);

// Escape closes the inline editor.
document.addEventListener(
    "keydown",
    (event) => {
        if (
            event.key === "Escape" &&
            !elements.editor.classList.contains("hidden")
        ) {
            closeEditor();
        }
    }
);


/* =========================================
   16. Automatic Date Refresh
========================================= */

/**
 * Check whether the local calendar day changed.
 * This is not used to calculate elapsed seconds.
 */
function checkDateChange() {
    const today = getLocalToday();

    if (today !== lastKnownDate) {
        lastKnownDate = today;

        render();
    }
}

// Check every 30 seconds.
setInterval(checkDateChange, 30000);

// Recheck when returning to the browser tab.
document.addEventListener(
    "visibilitychange",
    () => {
        if (!document.hidden) {
            checkDateChange();
        }
    }
);

// Recheck when the window receives focus.
window.addEventListener(
    "focus",
    checkDateChange
);

// Sync changes from other tabs sharing storage.
window.addEventListener(
    "storage",
    (event) => {
        if (event.key === STORAGE_KEY) {
            state = loadState();
            render();
        }
    }
);


/* =========================================
   17. Initialize
========================================= */

render();
