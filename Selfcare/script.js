
/* ==============================
   설정 및 저장소
============================== */

const STORAGE_KEY = "dailyWellness_v1";

const DEFAULT_HABITS = [
  { id: "reading", name: "독서" },
  { id: "exercise", name: "운동" },
  { id: "study", name: "공부" },
  { id: "rest", name: "휴식" }
];

function createDefaultData() {
  return {
    habits: DEFAULT_HABITS.map(h => ({ ...h })),
    daily: {},
    weekly: {}
  };
}

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return createDefaultData();

    const parsed = JSON.parse(saved);

    return {
      habits: Array.isArray(parsed.habits)
        ? parsed.habits
        : DEFAULT_HABITS.map(h => ({ ...h })),

      daily: parsed.daily &&
             typeof parsed.daily === "object"
        ? parsed.daily
        : {},

      weekly: parsed.weekly &&
              typeof parsed.weekly === "object"
        ? parsed.weekly
        : {}
    };
  } catch (error) {
    console.warn("저장 데이터 로딩 실패:", error);
    return createDefaultData();
  }
}

let data = loadData();

function saveData() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(data)
    );
  } catch (error) {
    console.error("데이터 저장 실패:", error);
  }
}

/* ==============================
   날짜 관련
============================== */

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDate(dateString) {
  const [year, month, day] = dateString
    .split("-")
    .map(Number);

  return new Date(year, month - 1, day);
}

function getMonday(date) {
  const result = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  result.setDate(result.getDate() + diff);
  return result;
}

let selectedWeek = getMonday(new Date());

function getWeekKey(date) {
  return formatDate(getMonday(date));
}

function getTodayKey() {
  return formatDate(new Date());
}

function getWeekDates(monday) {
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(date.getDate() + i);
    return formatDate(date);
  });
}

function changeWeek(amount) {
  const next = new Date(selectedWeek);
  next.setDate(next.getDate() + amount * 7);

  selectedWeek = getMonday(next);
  render();
}

function formatWeekLabel(monday) {
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);

  const start = `${monday.getMonth() + 1}/${monday.getDate()}`;
  const end = `${sunday.getMonth() + 1}/${sunday.getDate()}`;

  return `${start} — ${end}`;
}

/* ==============================
   Daily Wellness
============================== */

function getDailyRecord() {
  const today = getTodayKey();

  if (!data.daily[today]) {
    data.daily[today] = {
      sleep: 0,
      water: 0
    };
  }

  return data.daily[today];
}

function updateSleep(amount) {
  const record = getDailyRecord();

  record.sleep = Math.max(
    0,
    Math.min(24, Math.round((record.sleep + amount) * 2) / 2)
  );

  saveData();
  renderWellness();
}

function updateWater(amount) {
  const record = getDailyRecord();

  record.water = Math.max(
    0,
    record.water + amount
  );

  saveData();
  renderWellness();
}

function renderWellness() {
  const record = getDailyRecord();

  document.getElementById("sleepValue").textContent =
    record.sleep.toFixed(1);

  document.getElementById("waterValue").textContent =
    record.water;
}

/* ==============================
   Weekly Habits
============================== */

function getWeekRecord() {
  const weekKey = getWeekKey(selectedWeek);

  if (!data.weekly[weekKey]) {
    data.weekly[weekKey] = {};
  }

  return data.weekly[weekKey];
}

function getHabitChecks(habitId) {
  const week = getWeekRecord();

  if (!Array.isArray(week[habitId])) {
    week[habitId] = Array(7).fill(false);
  }

  return week[habitId];
}

function toggleHabit(habitId, dayIndex) {
  const checks = getHabitChecks(habitId);

  checks[dayIndex] = !checks[dayIndex];

  saveData();
  renderHabits();
  renderBalance();
}

function renderHabits() {
  const container = document.getElementById("habitRows");
  container.replaceChildren();

  document.getElementById("weekLabel").textContent =
    formatWeekLabel(selectedWeek);

  if (data.habits.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-habits";
    empty.textContent = "Add your first habit.";
    container.appendChild(empty);
    return;
  }

  data.habits.forEach(habit => {
    const row = document.createElement("div");
    row.className = "habit-row";

    const name = document.createElement("span");
    name.className = "habit-name";
    name.textContent = habit.name;

    const dayGrid = document.createElement("div");
    dayGrid.className = "day-grid";

    const checks = getHabitChecks(habit.id);

    checks.forEach((checked, dayIndex) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "habit-check";

      if (checked) {
        button.classList.add("checked");
        button.textContent = "✓";
      }

      button.setAttribute(
        "aria-label",
        `${habit.name} ${dayIndex + 1}번째 요일`
      );

      button.setAttribute("aria-pressed", String(checked));

      button.addEventListener("click", () => {
        toggleHabit(habit.id, dayIndex);
      });

      dayGrid.appendChild(button);
    });

    row.appendChild(name);
    row.appendChild(dayGrid);

    container.appendChild(row);
  });
}

/* ==============================
   Weekly Balance
============================== */

function calculateBalance() {
  const habitCount = data.habits.length;
  const total = habitCount * 7;

  let completed = 0;

  data.habits.forEach(habit => {
    completed += getHabitChecks(habit.id)
      .filter(Boolean).length;
  });

  const percent = total === 0
    ? 0
    : Math.round((completed / total) * 100);

  return {
    completed,
    total,
    percent
  };
}

function renderBalance() {
  const result = calculateBalance();

  document.getElementById("balancePercent").textContent =
    `${result.percent}%`;

  document.getElementById("progressFill").style.width =
    `${result.percent}%`;

  document.getElementById("balanceDescription").textContent =
    `${result.completed} of ${result.total} habits completed`;

  const currentWeek = getWeekKey(new Date());
  const displayedWeek = getWeekKey(selectedWeek);

  document.querySelector(".balance-tag").textContent =
    currentWeek === displayedWeek ? "This week" : "Selected week";
}

/* ==============================
   Habit 추가 / 수정 / 삭제
============================== */

const modal = document.getElementById("habitModal");
const habitInput = document.getElementById("habitInput");

let lastFocusedElement = null;

function openModal() {
  lastFocusedElement = document.activeElement;
  modal.hidden = false;
  renderHabitEditor();
  habitInput.focus();
}

function closeModal() {
  modal.hidden = true;
  if (lastFocusedElement) {
    lastFocusedElement.focus();
  }
}

function generateHabitId() {
  if (window.crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `habit_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function addHabit(name) {
  const trimmed = name.trim();

  if (!trimmed) return;

  data.habits.push({
    id: generateHabitId(),
    name: trimmed
  });

  saveData();
  render();
  renderHabitEditor();
}

function updateHabitName(id, name) {
  const habit = data.habits.find(h => h.id === id);

  if (!habit) return;

  const trimmed = name.trim();

  if (!trimmed) {
    renderHabitEditor();
    return;
  }

  habit.name = trimmed;

  saveData();
  renderHabits();
}

function deleteHabit(id) {
  data.habits = data.habits.filter(h => h.id !== id);

  // 삭제한 습관의 체크 기록도 정리
  Object.keys(data.weekly).forEach(weekKey => {
    delete data.weekly[weekKey][id];
  });

  saveData();
  render();
  renderHabitEditor();
}

function renderHabitEditor() {
  const container = document.getElementById("habitEditList");
  container.replaceChildren();

  data.habits.forEach(habit => {
    const row = document.createElement("div");
    row.className = "habit-edit-row";

    const input = document.createElement("input");
    input.type = "text";
    input.value = habit.name;
    input.maxLength = 60;
    input.setAttribute("aria-label", "습관 이름 수정");

    input.addEventListener("change", () => {
      updateHabitName(habit.id, input.value);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "habit-delete";
    deleteButton.textContent = "×";
    deleteButton.setAttribute(
      "aria-label",
      `${habit.name} 삭제`
    );

    deleteButton.addEventListener("click", () => {
      deleteHabit(habit.id);
    });

    row.appendChild(input);
    row.appendChild(deleteButton);

    container.appendChild(row);
  });
}

/* ==============================
   전체 렌더링
============================== */

function render() {
  renderWellness();
  renderHabits();
  renderBalance();
}

/* ==============================
   이벤트 등록
============================== */

// 수면
document.getElementById("sleepMinus")
  .addEventListener("click", () => updateSleep(-0.5));

document.getElementById("sleepPlus")
  .addEventListener("click", () => updateSleep(0.5));

// 수분
document.getElementById("waterMinus")
  .addEventListener("click", () => updateWater(-1));

document.getElementById("waterPlus")
  .addEventListener("click", () => updateWater(1));

// 주차 이동
document.getElementById("prevWeek")
  .addEventListener("click", () => changeWeek(-1));

document.getElementById("nextWeek")
  .addEventListener("click", () => changeWeek(1));

// 모달
document.getElementById("manageHabits")
  .addEventListener("click", openModal);

document.getElementById("closeModal")
  .addEventListener("click", closeModal);

modal.addEventListener("click", event => {
  if (event.target === modal) closeModal();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !modal.hidden) {
    closeModal();
  }
});

// Habit 추가
document.getElementById("habitForm")
  .addEventListener("submit", event => {
    event.preventDefault();

    addHabit(habitInput.value);
    habitInput.value = "";
    habitInput.focus();
  });

/* ==============================
   날짜 변경 감지
============================== */

let lastRenderedDate = getTodayKey();


function checkDateChange() {
  const today = getTodayKey();

  if (today !== lastRenderedDate) {
    const previousWeek = getWeekKey(
      parseDate(lastRenderedDate)
    );

    const wasViewingCurrentWeek =
      getWeekKey(selectedWeek) === previousWeek;

    lastRenderedDate = today;

    if (wasViewingCurrentWeek) {
      selectedWeek = getMonday(new Date());
    }

    render();
  }
}


// 페이지가 열린 상태에서 자정이 지나면 갱신
setInterval(checkDateChange, 60000);

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    checkDateChange();
  }
});

/* ==============================
   초기 실행
============================== */

render();
