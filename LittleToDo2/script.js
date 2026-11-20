
"use strict";

/* ========================================
   1. CONSTANTS
======================================== */

const STORAGE_KEY = "weeklyTodoPlanner_v1";

const WEEKDAYS = [
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
  "SUN"
];

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr",
  "May", "Jun", "Jul", "Aug",
  "Sep", "Oct", "Nov", "Dec"
];

const PRIORITY_ORDER = {
  high: 0,
  medium: 1,
  low: 2
};

const VALID_PRIORITIES = [
  "high",
  "medium",
  "low"
];

const VALID_REPEATS = [
  "none",
  "daily",
  "weekdays",
  "weekends",
  "weekly"
];


/* ========================================
   2. DOM ELEMENTS
======================================== */

const $ = (id) => document.getElementById(id);

const els = {
  weekLabel: $("weekLabel"),
  prevWeek: $("prevWeek"),
  nextWeek: $("nextWeek"),

  daysViewport: $("daysViewport"),
  daysTrack: $("daysTrack"),

  customScrollbar: $("customScrollbar"),
  scrollTrack: $("scrollTrack"),
  scrollThumb: $("scrollThumb"),

  somedayToggle: $("somedayToggle"),
  somedayPanel: $("somedayPanel"),
  somedayList: $("somedayList"),
  closeSomeday: $("closeSomeday"),
  addSomeday: $("addSomeday"),

  modalOverlay: $("modalOverlay"),
  modalTitle: $("modalTitle"),
  closeModal: $("closeModal"),

  taskForm: $("taskForm"),
  taskTitle: $("taskTitle"),
  taskDateMode: $("taskDateMode"),
  taskCustomDate: $("taskCustomDate"),
  taskPriority: $("taskPriority"),
  taskRepeat: $("taskRepeat"),

  formError: $("formError"),
  deleteTaskButton: $("deleteTaskButton"),
  cancelTask: $("cancelTask"),

  deleteConfirm: $("deleteConfirm"),
  deleteOptions: $("deleteOptions"),
  backToEdit: $("backToEdit"),

  toast: $("toast")
};


/* ========================================
   3. DATE UTILITIES
   Local timezone only
======================================== */

/*
  YYYY-MM-DD 생성.
  UTC의 toISOString()을 사용하지 않음.
*/
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/*
  로컬 날짜 문자열을 Date 객체로 변환.
  정오 기준으로 생성해 DST 영향을 최소화.
*/
function parseDate(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return null;
  }

  const [year, month, day] =
    value.split("-").map(Number);

  const date = new Date(
    year,
    month - 1,
    day,
    12
  );

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

/* 오늘 */
function todayString() {
  return formatDate(new Date());
}

/* 날짜에 일수 더하기 */
function addDays(value, amount) {
  const date = parseDate(value);

  if (!date) {
    return null;
  }

  date.setDate(
    date.getDate() + amount
  );

  return formatDate(date);
}

/* 월요일 시작 주 계산 */
function getMonday(value) {
  const date = parseDate(value);

  if (!date) {
    return null;
  }

  const day = date.getDay();

  const offset = (day + 6) % 7;

  date.setDate(
    date.getDate() - offset
  );

  return formatDate(date);
}

/* 주간 날짜 7개 */
function getWeekDates(monday) {
  return Array.from(
    { length: 7 },
    (_, index) => addDays(monday, index)
  );
}

/* 화면 날짜 범위 생성 */
function getWeekLabel(monday) {
  const start = parseDate(monday);
  const end = parseDate(
    addDays(monday, 6)
  );

  const startMonth =
    MONTHS[start.getMonth()];

  const endMonth =
    MONTHS[end.getMonth()];

  const startDay = start.getDate();
  const endDay = end.getDate();

  const startYear =
    start.getFullYear();

  const endYear =
    end.getFullYear();

  if (startYear !== endYear) {
    return (
      `${startMonth} ${startDay}, ${startYear}` +
      ` – ${endMonth} ${endDay}, ${endYear}`
    );
  }

  if (
    start.getMonth() ===
    end.getMonth()
  ) {
    return (
      `${startMonth} ${startDay}` +
      ` – ${endDay}, ${endYear}`
    );
  }

  return (
    `${startMonth} ${startDay}` +
    ` – ${endMonth} ${endDay}, ${endYear}`
  );
}


/* ========================================
   4. DATA VALIDATION
======================================== */

/* 안전한 객체 판별 */
function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

/* 완료 기록 정리 */
function sanitizeCompletedDates(value) {
  const result = {};

  if (!isPlainObject(value)) {
    return result;
  }

  for (const [date, completed] of
    Object.entries(value)) {

    if (
      parseDate(date) &&
      completed === true
    ) {
      result[date] = true;
    }
  }

  return result;
}

/* 예외 날짜 정리 */
function sanitizeExceptions(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value.filter(
        (date) => Boolean(parseDate(date))
      )
    )
  ];
}

/* 단일 할 일 데이터 검증 */
function sanitizeTask(raw) {
  if (!isPlainObject(raw)) {
    return null;
  }

  if (
    typeof raw.id !== "string" ||
    !raw.id.trim() ||
    typeof raw.title !== "string" ||
    !raw.title.trim()
  ) {
    return null;
  }

  const date =
    raw.date === null
      ? null
      : parseDate(raw.date)
        ? raw.date
        : undefined;

  if (date === undefined) {
    return null;
  }

  const priority =
    VALID_PRIORITIES.includes(raw.priority)
      ? raw.priority
      : "medium";

  let repeat =
    VALID_REPEATS.includes(raw.repeat)
      ? raw.repeat
      : "none";

  if (date === null) {
    repeat = "none";
  }

  return {
    id: raw.id,
    title: raw.title.trim().slice(0, 120),

    date,
    priority,
    repeat,

    completed: raw.completed === true,

    completedDates: sanitizeCompletedDates(
      raw.completedDates
    ),

    exceptions: sanitizeExceptions(
      raw.exceptions
    ),

    createdAt:
      typeof raw.createdAt === "string"
        ? raw.createdAt
        : new Date().toISOString(),

    updatedAt:
      typeof raw.updatedAt === "string"
        ? raw.updatedAt
        : new Date().toISOString()
  };
}


/* ========================================
   5. LOCAL STORAGE
======================================== */

let storageAvailable = true;
let startupWarning = "";

/* 데이터 불러오기 */
function loadTasks() {
  try {
    const saved = localStorage.getItem(
      STORAGE_KEY
    );

    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      throw new Error(
        "Invalid storage format"
      );
    }

    const cleanTasks = [];
    const usedIds = new Set();

    for (const item of parsed) {
      const clean = sanitizeTask(item);

      if (!clean) {
        continue;
      }

      if (usedIds.has(clean.id)) {
        continue;
      }

      usedIds.add(clean.id);
      cleanTasks.push(clean);
    }

    if (cleanTasks.length !== parsed.length) {
      startupWarning =
        "일부 저장 데이터에 문제가 있어 확인이 필요해요.";
    }

    return cleanTasks;

  } catch (error) {
    console.warn(
      "Task loading failed:",
      error
    );

    startupWarning =
      "저장된 데이터를 불러오지 못했어요.";

    return [];
  }
}

/*
  데이터 저장.
  실패하더라도 현재 화면은 유지.
*/
function saveTasks() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(tasks)
    );

    storageAvailable = true;

    return true;

  } catch (error) {
    console.warn(
      "Task saving failed:",
      error
    );

    storageAvailable = false;

    showToast(
      "저장에 실패했어요."
    );

    return false;
  }
}


/* ========================================
   6. APPLICATION STATE
======================================== */

let tasks = loadTasks();

let selectedDate = todayString();

let currentMonday = getMonday(
  selectedDate
);

/*
  편집 대상:
  {
    id: string,
    occurrenceDate: string | null
  }
*/
let editingTarget = null;

let previousFocus = null;

let toastTimer = null;

let scrollbarDragging = false;

let dragStartX = 0;
let dragStartScrollLeft = 0;


/* ========================================
   7. ID GENERATOR
======================================== */

function createId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return (
    `task_${Date.now()}_` +
    Math.random().toString(36).slice(2)
  );
}


/* ========================================
   8. RECURRING TASK LOGIC
======================================== */

/*
  날짜별로 실제 표시할지 판별.
  반복 시작일보다 과거에는 표시하지 않음.
*/
function occursOn(task, dateString) {
  if (task.date === null) {
    return false;
  }

  if (dateString < task.date) {
    return false;
  }

  if (task.exceptions.includes(dateString)) {
    return false;
  }

  if (task.repeat === "none") {
    return task.date === dateString;
  }

  const date = parseDate(dateString);

  if (!date) {
    return false;
  }

  const day = date.getDay();

  switch (task.repeat) {
    case "daily":
      return true;

    case "weekdays":
      return day >= 1 && day <= 5;

    case "weekends":
      return day === 0 || day === 6;

    case "weekly": {
      const start = parseDate(task.date);

      return (
        day === start.getDay()
      );
    }

    default:
      return false;
  }
}

/* 특정 날짜의 완료 상태 */
function isTaskCompleted(task, dateString) {
  if (task.repeat === "none") {
    return task.completed === true;
  }

  return (
    task.completedDates[dateString] === true
  );
}

/* 특정 날짜 완료 상태 변경 */
function setTaskCompleted(
  task,
  dateString,
  completed
) {
  if (task.repeat === "none") {
    task.completed = completed;

  } else {
    if (completed) {
      task.completedDates[dateString] = true;

    } else {
      delete task.completedDates[dateString];
    }
  }

  task.updatedAt = new Date().toISOString();
}

/* 우선순위 정렬 */
function sortTasksForDate(
  taskArray,
  dateString
) {
  return [...taskArray].sort((a, b) => {
    const aDone = isTaskCompleted(
      a,
      dateString
    );

    const bDone = isTaskCompleted(
      b,
      dateString
    );

    /* 완료 항목은 아래 */
    if (aDone !== bDone) {
      return Number(aDone) - Number(bDone);
    }

    /* 중요도 높은 순 */
    const priorityDifference =
      PRIORITY_ORDER[a.priority] -
      PRIORITY_ORDER[b.priority];

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    /* 등록 순서 유지 */
    return tasks.indexOf(a) -
      tasks.indexOf(b);
  });
}

/* 해당 날짜의 할 일 */
function getTasksForDate(dateString) {
  const matching = tasks.filter(
    (task) => occursOn(task, dateString)
  );

  return sortTasksForDate(
    matching,
    dateString
  );
}

/* Someday 목록 */
function getSomedayTasks() {
  const matching = tasks.filter(
    (task) => task.date === null
  );

  return sortTasksForDate(
    matching,
    null
  );
}


/* ========================================
   9. DOM HELPER
======================================== */

function makeElement(
  tagName,
  className = "",
  text = null
) {
  const element = document.createElement(
    tagName
  );

  if (className) {
    element.className = className;
  }

  if (text !== null) {
    element.textContent = text;
  }

  return element;
}


/* ========================================
   10. TASK ITEM RENDERING
======================================== */

function createTaskElement(
  task,
  dateString
) {
  const completed = isTaskCompleted(
    task,
    dateString
  );

  const item = makeElement(
    "div",
    "task-item"
  );

  if (completed) {
    item.classList.add("completed");
  }

  /* Checkbox */
  const checkbox = makeElement(
    "input",
    "task-checkbox"
  );

  checkbox.type = "checkbox";
  checkbox.checked = completed;

  checkbox.setAttribute(
    "aria-label",
    `${task.title} 완료 상태 변경`
  );

  checkbox.addEventListener(
    "change",
    () => {
      setTaskCompleted(
        task,
        dateString,
        checkbox.checked
      );

      saveTasks();

      renderAll(true);
    }
  );

  /* Task title button */
  const titleButton = makeElement(
    "button",
    "task-title-button"
  );

  titleButton.type = "button";

  titleButton.setAttribute(
    "aria-label",
    `${task.title} 수정`
  );

  /* Priority dot */
  const priorityDot = makeElement(
    "span",
    `priority-dot priority-${task.priority}`
  );

  priorityDot.setAttribute(
    "aria-hidden",
    "true"
  );

  /* Title */
  const text = makeElement(
    "span",
    "task-text",
    task.title
  );

  titleButton.append(
    priorityDot,
    text
  );

  titleButton.addEventListener(
    "click",
    () => {
      openEditModal(
        task.id,
        dateString
      );
    }
  );

  item.append(
    checkbox,
    titleButton
  );

  return item;
}


/* ========================================
   11. DAY CARD RENDERING
======================================== */

function createDayCard(
  dateString,
  index
) {
  const date = parseDate(dateString);

  const card = makeElement(
    "article",
    "day-card"
  );

  if (dateString === selectedDate) {
    card.classList.add("selected");
  }

  if (dateString === todayString()) {
    card.classList.add("today");
  }

  /* Day heading */
  const heading = makeElement(
    "button",
    "day-heading"
  );

  heading.type = "button";

  heading.setAttribute(
    "aria-label",
    `${dateString} 날짜 선택`
  );

  heading.setAttribute(
    "aria-pressed",
    String(dateString === selectedDate)
  );

  const dayName = makeElement(
    "span",
    "day-name",
    WEEKDAYS[index]
  );

  const dayNumber = makeElement(
    "span",
    "day-number",
    String(date.getDate())
  );

  heading.append(
    dayName,
    dayNumber
  );

  heading.addEventListener(
    "click",
    () => {
      selectedDate = dateString;

      renderAll(true);
    }
  );

  /* Task list */
  const list = makeElement(
    "div",
    "task-list"
  );

  const matching = getTasksForDate(
    dateString
  );

  for (const task of matching) {
    list.appendChild(
      createTaskElement(
        task,
        dateString
      )
    );
  }

  /* Add button */
  const addButton = makeElement(
    "button",
    "add-task",
    "+"
  );

  addButton.type = "button";

  addButton.setAttribute(
    "aria-label",
    `${dateString} 할 일 추가`
  );

  addButton.addEventListener(
    "click",
    () => {
      selectedDate = dateString;

      openAddModal(dateString);
    }
  );

  card.append(
    heading,
    list,
    addButton
  );

  return card;
}


/* ========================================
   12. WEEK RENDERING
======================================== */

function renderWeek(
  preserveScroll = false
) {
  const viewport = els.daysViewport;

  const oldScroll =
    preserveScroll
      ? viewport.scrollLeft
      : 0;

  els.weekLabel.textContent =
    getWeekLabel(currentMonday);

  const dates = getWeekDates(
    currentMonday
  );

  const fragment =
    document.createDocumentFragment();

  dates.forEach((date, index) => {
    fragment.appendChild(
      createDayCard(
        date,
        index
      )
    );
  });

  els.daysTrack.replaceChildren(
    fragment
  );

  viewport.scrollLeft = oldScroll;

  updateScrollbar();
}

/* 주차 이동 */
function changeWeek(direction) {
  currentMonday = addDays(
    currentMonday,
    direction * 7
  );

  selectedDate = addDays(
    selectedDate,
    direction * 7
  );

  renderAll(false);
}


/* ========================================
   13. SOMEDAY RENDERING
======================================== */

function renderSomeday() {
  const fragment =
    document.createDocumentFragment();

  const matching =
    getSomedayTasks();

  for (const task of matching) {
    fragment.appendChild(
      createTaskElement(
        task,
        null
      )
    );
  }

  els.somedayList.replaceChildren(
    fragment
  );
}

function openSomeday() {
  els.somedayPanel.hidden = false;

  els.somedayToggle.classList.add(
    "active"
  );

  els.somedayToggle.setAttribute(
    "aria-expanded",
    "true"
  );

  renderSomeday();
}

function closeSomeday() {
  els.somedayPanel.hidden = true;

  els.somedayToggle.classList.remove(
    "active"
  );

  els.somedayToggle.setAttribute(
    "aria-expanded",
    "false"
  );
}

function toggleSomeday() {
  if (els.somedayPanel.hidden) {
    openSomeday();
  } else {
    closeSomeday();
  }
}


/* ========================================
   14. CUSTOM SCROLLBAR
======================================== */

/*
  가로 스크롤 비율과 핸들 위치 동기화.
*/
function updateScrollbar() {
  const viewport = els.daysViewport;

  const visibleWidth =
    viewport.clientWidth;

  const totalWidth =
    viewport.scrollWidth;

  const maxScroll = Math.max(
    0,
    totalWidth - visibleWidth
  );

  if (
    maxScroll <= 1 ||
    visibleWidth === 0
  ) {
    els.customScrollbar.classList.add(
      "is-hidden"
    );

    els.scrollTrack.setAttribute(
      "aria-valuenow",
      "0"
    );

    return;
  }

  els.customScrollbar.classList.remove(
    "is-hidden"
  );

  const trackWidth =
    els.scrollTrack.clientWidth;

  if (!trackWidth) {
    return;
  }

  const visibleRatio =
    visibleWidth / totalWidth;

  const thumbWidth = Math.min(
    trackWidth,
    Math.max(
      28,
      trackWidth * visibleRatio
    )
  );

  const maxThumbMove =
    trackWidth - thumbWidth;

  const scrollRatio =
    viewport.scrollLeft / maxScroll;

  const thumbLeft =
    maxThumbMove * scrollRatio;

  els.scrollThumb.style.width =
    `${thumbWidth}px`;

  els.scrollThumb.style.left =
    `${thumbLeft}px`;

  els.scrollTrack.setAttribute(
    "aria-valuenow",
    String(
      Math.round(scrollRatio * 100)
    )
  );
}

/*
  트랙에서 클릭한 위치로 이동.
*/
function scrollToTrackPosition(clientX) {
  const rect =
    els.scrollTrack.getBoundingClientRect();

  const thumbWidth =
    els.scrollThumb.offsetWidth;

  const maxThumbMove =
    rect.width - thumbWidth;

  if (maxThumbMove <= 0) {
    return;
  }

  const targetThumbLeft =
    clientX -
    rect.left -
    thumbWidth / 2;

  const ratio = Math.max(
    0,
    Math.min(
      1,
      targetThumbLeft / maxThumbMove
    )
  );

  const viewport = els.daysViewport;

  const maxScroll =
    viewport.scrollWidth -
    viewport.clientWidth;

  viewport.scrollLeft =
    ratio * maxScroll;
}

/*
  스크롤바 핸들 드래그 시작.
*/
function startThumbDrag(event) {
  if (
    event.pointerType === "mouse" &&
    event.button !== 0
  ) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  scrollbarDragging = true;

  dragStartX = event.clientX;

  dragStartScrollLeft =
    els.daysViewport.scrollLeft;

  els.scrollThumb.classList.add(
    "dragging"
  );

  els.scrollThumb.setPointerCapture(
    event.pointerId
  );
}

/* 핸들 드래그 중 */
function moveThumbDrag(event) {
  if (!scrollbarDragging) {
    return;
  }

  const deltaX =
    event.clientX - dragStartX;

  const trackWidth =
    els.scrollTrack.clientWidth;

  const thumbWidth =
    els.scrollThumb.offsetWidth;

  const maxThumbMove =
    trackWidth - thumbWidth;

  const viewport = els.daysViewport;

  const maxScroll =
    viewport.scrollWidth -
    viewport.clientWidth;

  if (maxThumbMove <= 0) {
    return;
  }

  const scrollDelta =
    deltaX *
    (maxScroll / maxThumbMove);

  viewport.scrollLeft =
    dragStartScrollLeft + scrollDelta;
}

/* 드래그 종료 */
function endThumbDrag() {
  scrollbarDragging = false;

  els.scrollThumb.classList.remove(
    "dragging"
  );
}

/*
  마우스 휠을 가로 스크롤로 변환.
  카드 내부 세로 목록의 휠은 그대로 유지.
*/
function handlePlannerWheel(event) {
  if (
    event.target.closest(".task-list")
  ) {
    return;
  }

  const viewport = els.daysViewport;

  const maxScroll =
    viewport.scrollWidth -
    viewport.clientWidth;

  if (maxScroll <= 0) {
    return;
  }

  let delta =
    Math.abs(event.deltaX) >
    Math.abs(event.deltaY)
      ? event.deltaX
      : event.deltaY;

  if (event.deltaMode === 1) {
    delta *= 16;
  }

  if (event.deltaMode === 2) {
    delta *= viewport.clientWidth;
  }

  const target = Math.max(
    0,
    Math.min(
      maxScroll,
      viewport.scrollLeft + delta
    )
  );

  if (
    target !== viewport.scrollLeft
  ) {
    event.preventDefault();

    viewport.scrollLeft = target;
  }
}

/* 키보드 스크롤 */
function handleScrollbarKeydown(event) {
  const viewport = els.daysViewport;

  const maxScroll = Math.max(
    0,
    viewport.scrollWidth -
    viewport.clientWidth
  );

  switch (event.key) {
    case "ArrowRight":
      viewport.scrollLeft += 45;
      break;

    case "ArrowLeft":
      viewport.scrollLeft -= 45;
      break;

    case "Home":
      viewport.scrollLeft = 0;
      break;

    case "End":
      viewport.scrollLeft = maxScroll;
      break;

    default:
      return;
  }

  event.preventDefault();
}


/* ========================================
   15. FORM DATE CONTROL
======================================== */

function updateDateControls() {
  const mode =
    els.taskDateMode.value;

  const isCustom =
    mode === "custom";

  const isSomeday =
    mode === "someday";

  els.taskCustomDate.hidden =
    !isCustom;

  els.taskCustomDate.disabled =
    !isCustom;

  if (isSomeday) {
    els.taskRepeat.value = "none";
  }

  els.taskRepeat.disabled =
    isSomeday;
}

/*
  폼의 Date 값을 실제 날짜 문자열로 변환.
*/
function getDateFromForm() {
  const mode =
    els.taskDateMode.value;

  switch (mode) {
    case "today":
      return todayString();

    case "tomorrow":
      return addDays(
        todayString(),
        1
      );

    case "someday":
      return null;

    case "custom":
      return els.taskCustomDate.value;

    default:
      return undefined;
  }
}

/*
  모달에서 날짜를 설정.
  카드 + 버튼 클릭 시 해당 날짜를 기본값으로 사용.
*/
function setFormDate(dateString) {
  if (dateString === null) {
    els.taskDateMode.value =
      "someday";

    els.taskCustomDate.value =
      todayString();

  } else {
    els.taskDateMode.value =
      "custom";

    els.taskCustomDate.value =
      dateString;
  }

  updateDateControls();
}


/* ========================================
   16. MODAL MANAGEMENT
======================================== */

function showModal() {
  previousFocus =
    document.activeElement;

  els.modalOverlay.hidden = false;

  els.taskForm.hidden = false;
  els.deleteConfirm.hidden = true;

  els.formError.hidden = true;

  requestAnimationFrame(() => {
    els.taskTitle.focus();
  });
}

function closeModal() {
  els.modalOverlay.hidden = true;

  els.taskForm.hidden = false;
  els.deleteConfirm.hidden = true;

  editingTarget = null;

  if (
    previousFocus &&
    previousFocus.isConnected
  ) {
    previousFocus.focus();
  }

  previousFocus = null;
}

/* 신규 할 일 */
function openAddModal(dateString) {
  editingTarget = null;

  els.taskForm.reset();

  els.modalTitle.textContent =
    "New Task";

  els.deleteTaskButton.hidden =
    true;

  els.taskPriority.value =
    "medium";

  els.taskRepeat.value =
    "none";

  setFormDate(dateString);

  showModal();
}

/* 기존 할 일 편집 */
function openEditModal(
  taskId,
  occurrenceDate
) {
  const task = tasks.find(
    (item) => item.id === taskId
  );

  if (!task) {
    return;
  }

  editingTarget = {
    id: taskId,
    occurrenceDate
  };

  els.taskForm.reset();

  els.modalTitle.textContent =
    "Edit Task";

  els.deleteTaskButton.hidden =
    false;

  els.taskTitle.value =
    task.title;

  els.taskPriority.value =
    task.priority;

  els.taskRepeat.value =
    task.repeat;

  /*
    반복 항목은 원래 시작일을 표시.
    이를 통해 다른 날짜의 반복 규칙도 유지됨.
  */
  setFormDate(task.date);

  showModal();
}

/* 입력 오류 표시 */
function showFormError(message) {
  els.formError.textContent =
    message;

  els.formError.hidden = false;
}


/* ========================================
   17. CREATE / UPDATE TASKS
======================================== */

function handleTaskSubmit(event) {
  event.preventDefault();

  els.formError.hidden = true;

  /* Title validation */
  const title =
    els.taskTitle.value.trim();

  if (!title) {
    showFormError(
      "할 일을 입력해 주세요."
    );

    els.taskTitle.focus();
    return;
  }

  if (title.length > 120) {
    showFormError(
      "할 일은 120자 이내로 입력해 주세요."
    );

    return;
  }

  /* Date validation */
  const date = getDateFromForm();

  if (
    date === undefined ||
    (
      date !== null &&
      !parseDate(date)
    )
  ) {
    showFormError(
      "올바른 날짜를 선택해 주세요."
    );

    return;
  }

  const priority =
    els.taskPriority.value;

  if (
    !VALID_PRIORITIES.includes(priority)
  ) {
    showFormError(
      "중요도를 선택해 주세요."
    );

    return;
  }

  let repeat =
    els.taskRepeat.value;

  if (
    !VALID_REPEATS.includes(repeat)
  ) {
    showFormError(
      "반복 설정을 확인해 주세요."
    );

    return;
  }

  if (date === null) {
    repeat = "none";
  }

  const now =
    new Date().toISOString();

  /* Edit existing task */
  if (editingTarget) {
    const task = tasks.find(
      (item) =>
        item.id === editingTarget.id
    );

    if (!task) {
      showFormError(
        "할 일을 찾을 수 없어요."
      );

      return;
    }

    const oldRepeat =
      task.repeat;

    const oldDate =
      task.date;

    /*
      반복 -> 일반 일정으로 변경하는 경우,
      현재 선택한 반복 날짜의 완료 상태를 사용.
    */
    if (
      oldRepeat !== "none" &&
      repeat === "none"
    ) {
      const activeDate =
        editingTarget.occurrenceDate ||
        oldDate;

      task.completed =
        task.completedDates[activeDate] === true;

    } else if (
      oldRepeat === "none" &&
      repeat !== "none"
    ) {
      /*
        일반 일정 -> 반복 일정.
        기존 완료 상태를 원래 날짜에 기록.
      */
      if (
        task.completed &&
        oldDate !== null
      ) {
        task.completedDates[oldDate] =
          true;
      }
    }

    task.title = title;
    task.date = date;
    task.priority = priority;
    task.repeat = repeat;

    task.updatedAt = now;

    /*
      completedDates / exceptions는
      수정 시 초기화하지 않음.

      과거 반복 완료 기록이 보존됨.
    */

    const saved = saveTasks();

    closeModal();

    navigateToTaskDate(date);

    renderAll(true);

    if (saved) {
      showToast(
        "할 일이 수정되었어요."
      );
    }

    return;
  }

  /* Create new task */
  const newTask = {
    id: createId(),

    title,
    date,
    priority,
    repeat,

    completed: false,

    completedDates: {},
    exceptions: [],

    createdAt: now,
    updatedAt: now
  };

  tasks.push(newTask);

  const saved = saveTasks();

  closeModal();

  navigateToTaskDate(date);

  renderAll(true);

  if (saved) {
    showToast(
      "할 일이 추가되었어요 ♡"
    );
  }
}

/*
  날짜가 바뀌면 해당 주로 이동.
  Someday는 기존 주 유지.
*/
function navigateToTaskDate(dateString) {
  if (dateString === null) {
    openSomeday();
    return;
  }

  selectedDate = dateString;

  currentMonday = getMonday(
    dateString
  );

  closeSomeday();
}


/* ========================================
   18. DELETE CONFIRMATION
======================================== */

function openDeleteConfirm() {
  if (!editingTarget) {
    return;
  }

  const task = tasks.find(
    (item) =>
      item.id === editingTarget.id
  );

  if (!task) {
    return;
  }

  els.taskForm.hidden = true;
  els.deleteConfirm.hidden = false;

  els.modalTitle.textContent =
    "Delete Task";

  els.deleteOptions.replaceChildren();

  /*
    반복 일정은
    1. 이번 날짜만 삭제
    2. 전체 반복 일정 삭제
  */
  if (task.repeat !== "none") {
    const singleButton = makeElement(
      "button",
      "delete-option",
      "Delete this occurrence"
    );

    singleButton.type = "button";

    singleButton.addEventListener(
      "click",
      () => deleteSingleOccurrence(
        task.id,
        editingTarget.occurrenceDate
      )
    );

    const allButton = makeElement(
      "button",
      "delete-option danger",
      "Delete entire repeating task"
    );

    allButton.type = "button";

    allButton.addEventListener(
      "click",
      () => deleteEntireTask(
        task.id
      )
    );

    els.deleteOptions.append(
      singleButton,
      allButton
    );

  } else {
    /* 일반 일정 */
    const deleteButton = makeElement(
      "button",
      "delete-option danger",
      "Delete task"
    );

    deleteButton.type = "button";

    deleteButton.addEventListener(
      "click",
      () => deleteEntireTask(
        task.id
      )
    );

    els.deleteOptions.append(
      deleteButton
    );
  }

  els.backToEdit.focus();
}

/* 특정 반복 날짜만 삭제 */
function deleteSingleOccurrence(
  taskId,
  dateString
) {
  const task = tasks.find(
    (item) => item.id === taskId
  );

  if (
    !task ||
    !dateString ||
    task.repeat === "none"
  ) {
    return;
  }

  if (
    !task.exceptions.includes(dateString)
  ) {
    task.exceptions.push(
      dateString
    );
  }

  task.updatedAt =
    new Date().toISOString();

  /*
    완료 기록은 삭제하지 않음.
    해당 날짜는 예외 목록으로만 관리.
  */

  const saved = saveTasks();

  closeModal();

  renderAll(true);

  if (saved) {
    showToast(
      "할 일이 삭제되었어요."
    );
  }
}

/* 전체 할 일 삭제 */
function deleteEntireTask(taskId) {
  tasks = tasks.filter(
    (task) => task.id !== taskId
  );

  const saved = saveTasks();

  closeModal();

  renderAll(true);

  if (saved) {
    showToast(
      "할 일이 삭제되었어요."
    );
  }
}

/* 삭제 확인에서 편집으로 복귀 */
function backToEdit() {
  els.deleteConfirm.hidden = true;

  els.taskForm.hidden = false;

  els.modalTitle.textContent =
    "Edit Task";

  els.deleteTaskButton.focus();
}


/* ========================================
   19. TOAST MESSAGE
======================================== */

function showToast(message) {
  clearTimeout(toastTimer);

  els.toast.textContent = message;

  els.toast.classList.add(
    "visible"
  );

  toastTimer = setTimeout(() => {
    els.toast.classList.remove(
      "visible"
    );
  }, 2000);
}


/* ========================================
   20. RENDER ALL
======================================== */

function renderAll(
  preserveScroll = false
) {
  renderWeek(preserveScroll);

  renderSomeday();
}


/* ========================================
   21. KEYBOARD ACCESSIBILITY
======================================== */

/* 모달 내부 포커스 유지 */
function trapModalFocus(event) {
  if (
    els.modalOverlay.hidden ||
    event.key !== "Tab"
  ) {
    return;
  }

  const modal =
    els.modalOverlay.querySelector(
      ".modal"
    );

  const focusable = [
    ...modal.querySelectorAll(
      "button:not([disabled]), " +
      "input:not([disabled]), " +
      "select:not([disabled])"
    )
  ].filter(
    (element) =>
      element.getClientRects().length > 0
  );

  if (!focusable.length) {
    return;
  }

  const first = focusable[0];
  const last = focusable[
    focusable.length - 1
  ];

  if (
    event.shiftKey &&
    document.activeElement === first
  ) {
    event.preventDefault();
    last.focus();

  } else if (
    !event.shiftKey &&
    document.activeElement === last
  ) {
    event.preventDefault();
    first.focus();
  }
}


/* ========================================
   22. EVENT LISTENERS
======================================== */

function bindEvents() {
  /* Week navigation */
  els.prevWeek.addEventListener(
    "click",
    () => changeWeek(-1)
  );

  els.nextWeek.addEventListener(
    "click",
    () => changeWeek(1)
  );

  /* Someday */
  els.somedayToggle.addEventListener(
    "click",
    toggleSomeday
  );

  els.closeSomeday.addEventListener(
    "click",
    closeSomeday
  );

  els.addSomeday.addEventListener(
    "click",
    () => openAddModal(null)
  );

  /* Modal */
  els.closeModal.addEventListener(
    "click",
    closeModal
  );

  els.cancelTask.addEventListener(
    "click",
    closeModal
  );

  els.taskForm.addEventListener(
    "submit",
    handleTaskSubmit
  );

  els.taskDateMode.addEventListener(
    "change",
    updateDateControls
  );

  els.deleteTaskButton.addEventListener(
    "click",
    openDeleteConfirm
  );

  els.backToEdit.addEventListener(
    "click",
    backToEdit
  );

  /* Overlay click */
  els.modalOverlay.addEventListener(
    "click",
    (event) => {
      if (
        event.target ===
        els.modalOverlay
      ) {
        closeModal();
      }
    }
  );

  /* Escape + Tab */
  document.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key === "Escape"
      ) {
        if (
          !els.modalOverlay.hidden
        ) {
          closeModal();

        } else if (
          !els.somedayPanel.hidden
        ) {
          closeSomeday();
        }
      }

      trapModalFocus(event);
    }
  );

  /* Horizontal viewport scroll */
  els.daysViewport.addEventListener(
    "scroll",
    updateScrollbar,
    { passive: true }
  );

  /* Mouse wheel */
  els.daysViewport.addEventListener(
    "wheel",
    handlePlannerWheel,
    { passive: false }
  );

  /* Scrollbar track click */
  els.scrollTrack.addEventListener(
    "pointerdown",
    (event) => {
      if (
        event.target ===
        els.scrollThumb
      ) {
        return;
      }

      if (
        event.pointerType === "mouse" &&
        event.button !== 0
      ) {
        return;
      }

      scrollToTrackPosition(
        event.clientX
      );
    }
  );

  /* Thumb drag */
  els.scrollThumb.addEventListener(
    "pointerdown",
    startThumbDrag
  );

  els.scrollThumb.addEventListener(
    "pointermove",
    moveThumbDrag
  );

  els.scrollThumb.addEventListener(
    "pointerup",
    endThumbDrag
  );

  els.scrollThumb.addEventListener(
    "pointercancel",
    endThumbDrag
  );

  els.scrollThumb.addEventListener(
    "lostpointercapture",
    endThumbDrag
  );

  /* Scrollbar keyboard navigation */
  els.scrollTrack.addEventListener(
    "keydown",
    handleScrollbarKeydown
  );

  /* Responsive scrollbar updates */
  if (
    typeof ResizeObserver !== "undefined"
  ) {
    const observer = new ResizeObserver(
      updateScrollbar
    );

    observer.observe(
      els.daysViewport
    );

    observer.observe(
      els.daysTrack
    );
  }

  window.addEventListener(
    "resize",
    updateScrollbar
  );
}


/* ========================================
   23. INITIALIZATION
======================================== */

function init() {
  bindEvents();

  renderAll(false);

  requestAnimationFrame(() => {
    updateScrollbar();
  });

  if (startupWarning) {
    showToast(startupWarning);

  } else if (!storageAvailable) {
    showToast(
      "브라우저 저장소를 확인해 주세요."
    );
  }
}

init();
