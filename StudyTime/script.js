
// ================================
// ELEMENTS
// ================================

const $ = id => document.getElementById(id);

const totalTime = $("totalTime");
const weekLabel = $("weekLabel");
const weeklyChart = $("weeklyChart");

const hoursInput = $("hoursInput");
const minutesInput = $("minutesInput");

const saveBtn = $("saveBtn");
const deleteBtn = $("deleteBtn");

const selectedDateLabel = $("selectedDateLabel");
const resetDateBtn = $("resetDate");

const prevWeekBtn = $("prevWeek");
const nextWeekBtn = $("nextWeek");


// ================================
// STORAGE
// ================================

const STORAGE_KEY = "studyHoursRecords_v1";

function loadRecords() {
    try {
        const data = JSON.parse(
            localStorage.getItem(STORAGE_KEY)
        );

        return data && typeof data === "object"
            && !Array.isArray(data)
            ? data
            : {};
    } catch {
        return {};
    }
}

let records = loadRecords();

function saveRecords() {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(records)
    );
}


// ================================
// DATE UTILITIES
// ================================

function dateKey(date) {
    const year = date.getFullYear();
    const month = String(
        date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function parseDate(key) {
    const [year, month, day] = key
        .split("-")
        .map(Number);

    return new Date(year, month - 1, day);
}

function addDays(date, days) {
    const result = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
    );

    result.setDate(result.getDate() + days);

    return result;
}

function startOfWeek(date) {
    const result = addDays(date, 0);

    const day = result.getDay();

    // Monday = first day
    const difference = day === 0 ? -6 : 1 - day;

    result.setDate(result.getDate() + difference);

    return result;
}

function formatDate(key) {
    const date = parseDate(key);

    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric"
    });
}

function formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    return `${hours}h ${mins}m`;
}


// ================================
// STATE
// ================================

const todayKey = dateKey(new Date());

let selectedDate = todayKey;

let currentWeek = startOfWeek(new Date());

const DAY_LABELS = [
    "M", "T", "W", "T", "F", "S", "S"
];


// ================================
// INPUT
// ================================

function updateInput() {
    const minutes = Number(records[selectedDate]) || 0;

    hoursInput.value = Math.floor(minutes / 60);
    minutesInput.value = minutes % 60;

    if (selectedDate === todayKey) {
        selectedDateLabel.textContent = "Today";
        resetDateBtn.hidden = true;
    } else {
        selectedDateLabel.textContent =
            formatDate(selectedDate);

        resetDateBtn.hidden = false;
    }

    deleteBtn.hidden =
        !Object.prototype.hasOwnProperty.call(
            records,
            selectedDate
        );
}

function selectDate(key) {
    selectedDate = key;

    updateInput();
    renderChart();
}


// ================================
// WEEKLY DATA
// ================================

function getWeekData() {
    const days = [];

    for (let i = 0; i < 7; i++) {
        const date = addDays(currentWeek, i);
        const key = dateKey(date);

        days.push({
            key,
            label: DAY_LABELS[i],
            minutes: Number(records[key]) || 0
        });
    }

    return days;
}


// ================================
// RENDER CHART
// ================================

function renderChart() {
    const days = getWeekData();

    const maxMinutes = Math.max(
        ...days.map(day => day.minutes),
        60
    );

    weeklyChart.innerHTML = "";

    days.forEach(day => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "chart-day";

        if (day.key === selectedDate) {
            button.classList.add("active");
        }

        const barArea = document.createElement("div");
        barArea.className = "bar-area";

        const bar = document.createElement("div");
        bar.className = "bar";

        const height = day.minutes === 0
            ? 3
            : (day.minutes / maxMinutes) * 90;

        bar.style.height = `${height}px`;

        const dayLabel = document.createElement("span");
        dayLabel.className = "day-label";
        dayLabel.textContent = day.label;

        barArea.appendChild(bar);

        button.appendChild(barArea);
        button.appendChild(dayLabel);

        button.title =
            `${day.key} · ${formatTime(day.minutes)}`;

        button.setAttribute(
            "aria-label",
            `${day.key}, ${formatTime(day.minutes)}`
        );

        button.addEventListener("click", () => {
            selectDate(day.key);
        });

        weeklyChart.appendChild(button);
    });
}


// ================================
// RENDER SUMMARY
// ================================

function renderSummary() {
    const days = getWeekData();

    const total = days.reduce(
        (sum, day) => sum + day.minutes,
        0
    );

    totalTime.textContent = formatTime(total);

    const start = currentWeek;
    const end = addDays(currentWeek, 6);

    const currentStart = dateKey(
        startOfWeek(new Date())
    );

    if (dateKey(start) === currentStart) {
        weekLabel.textContent = "THIS WEEK";
    } else {
        weekLabel.textContent =
            `${formatDate(dateKey(start))} – ${formatDate(dateKey(end))}`;
    }
}


// ================================
// MAIN RENDER
// ================================

function render() {
    updateInput();
    renderSummary();
    renderChart();
}


// ================================
// SAVE / EDIT
// ================================

saveBtn.addEventListener("click", () => {
    const hoursText = hoursInput.value.trim();
    const minutesText = minutesInput.value.trim();

    const hours = Number(hoursText);
    const minutes = Number(minutesText);

    if (
        hoursText === "" ||
        minutesText === "" ||
        !Number.isInteger(hours) ||
        !Number.isInteger(minutes) ||
        hours < 0 ||
        hours > 999 ||
        minutes < 0 ||
        minutes > 59
    ) {
        hoursInput.setCustomValidity(
            "시간은 0~999, 분은 0~59 사이로 입력해 주세요."
        );

        hoursInput.reportValidity();
        hoursInput.setCustomValidity("");
        return;
    }

    const totalMinutes = hours * 60 + minutes;

    // Same date = update existing record
    records[selectedDate] = totalMinutes;

    saveRecords();
    render();

    const originalText = saveBtn.textContent;

    saveBtn.textContent = "Saved!";

    setTimeout(() => {
        saveBtn.textContent = originalText;
    }, 1000);
});


// ================================
// DELETE
// ================================

deleteBtn.addEventListener("click", () => {
    if (
        !Object.prototype.hasOwnProperty.call(
            records,
            selectedDate
        )
    ) {
        return;
    }

    // No alert / confirm for Notion iframe
    delete records[selectedDate];

    saveRecords();
    render();
});


// ================================
// WEEK NAVIGATION
// ================================

prevWeekBtn.addEventListener("click", () => {
    currentWeek = addDays(currentWeek, -7);

    selectedDate = dateKey(currentWeek);

    render();
});

nextWeekBtn.addEventListener("click", () => {
    currentWeek = addDays(currentWeek, 7);

    selectedDate = dateKey(currentWeek);

    render();
});

resetDateBtn.addEventListener("click", () => {
    currentWeek = startOfWeek(new Date());

    selectedDate = dateKey(new Date());

    render();
});


// ================================
// INITIALIZE
// ================================

render();
