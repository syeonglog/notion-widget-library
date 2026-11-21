
"use strict";

/* =========================
   1. 기본 설정 및 데이터
========================= */

const STORAGE_KEY = "littleStudyPlan_v1";
const SUBJECT_STORAGE_KEY = "littleStudyPlan_subjects_v1";

const $ = id => document.getElementById(id);

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const $viewport = $("cardViewport");
const $track = $("cardTrack");
const $scrollbar = $("scrollbar");
const $thumb = $("scrollThumb");

let tasks = [];
let subjects = ["General"];
let currentWeek = startOfWeek(new Date());
let editingId = null;
let editingOccurrence = null;
let storageAvailable = true;
let toastTimer = null;
let pendingConfirmation = null;
let previousFocus = null;

function safeRead(key) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? null : JSON.parse(value);
  } catch {
    storageAvailable = false;
    return null;
  }
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    localStorage.setItem(
      SUBJECT_STORAGE_KEY,
      JSON.stringify(subjects)
    );
    storageAvailable = true;
    return true;
  } catch {
    storageAvailable = false;
    toast("저장에 실패했어요. 브라우저 저장 설정을 확인해 주세요.");
    return false;
  }
}

function validDate(value) {
  if (typeof value !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d, 12);

  return date.getFullYear() === y &&
         date.getMonth() === m - 1 &&
         date.getDate() === d;
}

function loadData() {
  const savedTasks = safeRead(STORAGE_KEY);
  const savedSubjects = safeRead(SUBJECT_STORAGE_KEY);

  if (Array.isArray(savedSubjects)) {
    subjects = ["General"];

    for (const name of savedSubjects) {
      if (typeof name !== "string") continue;
      const clean = name.trim();

      if (!clean || clean.length > 30) continue;
      if (subjects.some(s => s.toLowerCase() === clean.toLowerCase())) {
        continue;
      }
      subjects.push(clean);
    }
  }

  if (Array.isArray(savedTasks)) {
    const ids = new Set();

    tasks = savedTasks.filter(task => {
      if (!task || typeof task !== "object") return false;
      if (typeof task.id !== "string" || !task.id ||
          ids.has(task.id)) return false;
      if (typeof task.title !== "string" ||
          !task.title.trim() || task.title.length > 120) return false;
      if (task.date !== null && !validDate(task.date)) return false;

      ids.add(task.id);
      return true;
    }).map(task => {
      const repeats = [
        "none", "daily", "weekdays", "weekends", "weekly"
      ];
      const repeat = repeats.includes(task.repeat) && task.date
        ? task.repeat : "none";

      const cleanMap = object => {
        const result = {};
        if (!object || typeof object !== "object" ||
            Array.isArray(object)) return result;

        for (const [key, value] of Object.entries(object)) {
          if (validDate(key) && value === true) result[key] = true;
        }
        return result;
      };

      return {
        id: task.id,
        title: task.title.trim(),
        date: task.date,
        subject: subjects.includes(task.subject)
          ? task.subject : "General",
        repeat,
        completed: Boolean(task.completed),
        completions: cleanMap(task.completions),
        exceptions: cleanMap(task.exceptions),
        createdAt: task.createdAt || new Date().toISOString(),
        updatedAt: task.updatedAt || new Date().toISOString()
      };
    });
  }
}

function uid() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function toast(message) {
  const element = $("toast");
  clearTimeout(toastTimer);

  element.textContent = message;
  element.classList.add("show");

  toastTimer = setTimeout(() => {
    element.classList.remove("show");
  }, 2000);
}

/* =========================
   2. 로컬 날짜 처리
========================= */

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromKey(key) {
  if (!validDate(key)) return null;
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function startOfWeek(date) {
  const copy = new Date(
    date.getFullYear(), date.getMonth(), date.getDate(), 12
  );
  const offset = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - offset);
  return copy;
}

function todayKey() {
  return dateKey(new Date());
}

function formatWeek(start) {
  const end = addDays(start, 6);
  const first = MONTHS[start.getMonth()];
  const last = MONTHS[end.getMonth()];

  if (start.getFullYear() !== end.getFullYear()) {
    return `${first} ${start.getDate()}, ${start.getFullYear()} – ` +
           `${last} ${end.getDate()}, ${end.getFullYear()}`;
  }

  if (start.getMonth() !== end.getMonth()) {
    return `${first} ${start.getDate()} – ` +
           `${last} ${end.getDate()}, ${end.getFullYear()}`;
  }

  return `${first} ${start.getDate()} – ${end.getDate()}, ` +
         `${end.getFullYear()}`;
}

/* =========================
   3. 반복 일정 및 완료 상태
========================= */

function occursOn(task, key) {
  if (!task.date || !validDate(key)) return false;
  if (key < task.date) return false;
  if (task.exceptions[key]) return false;

  if (task.repeat === "none") return task.date === key;
  if (task.repeat === "daily") return true;

  const day = fromKey(key).getDay();

  if (task.repeat === "weekdays") {
    return day >= 1 && day <= 5;
  }

  if (task.repeat === "weekends") {
    return day === 0 || day === 6;
  }

  if (task.repeat === "weekly") {
    return day === fromKey(task.date).getDay();
  }

  return false;
}

function isCompleted(task, key) {
  if (task.repeat !== "none") {
    return Boolean(task.completions[key]);
  }
  return Boolean(task.completed);
}

function getDayTasks(key) {
  return tasks
    .filter(task => occursOn(task, key))
    .sort((a, b) => {
      const doneA = Number(isCompleted(a, key));
      const doneB = Number(isCompleted(b, key));
      if (doneA !== doneB) return doneA - doneB;
      return tasks.indexOf(a) - tasks.indexOf(b);
    });
}

function getSomedayTasks() {
  return tasks
    .filter(task => task.date === null)
    .sort((a, b) => {
      if (a.completed !== b.completed) {
        return Number(a.completed) - Number(b.completed);
      }
      return tasks.indexOf(a) - tasks.indexOf(b);
    });
}

/* =========================
   4. 카드 렌더링
========================= */

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function renderTask(task, key) {
  const done = isCompleted(task, key);

  return `
    <div class="task-item ${done ? "completed" : ""}">
      <span class="subject-tag">${escapeHTML(task.subject)}</span>
      <div class="task-content">
        <input
          class="task-checkbox"
          type="checkbox"
          data-action="complete"
          data-id="${escapeHTML(task.id)}"
          data-date="${key || ""}"
          aria-label="${escapeHTML(task.title)} 완료"
          ${done ? "checked" : ""}
        >
        <button
          class="task-title"
          data-action="edit"
          data-id="${escapeHTML(task.id)}"
          data-date="${key || ""}"
        >${escapeHTML(task.title)}</button>
      </div>
    </div>
  `;
}

function renderCards() {
  $("weekLabel").textContent = formatWeek(currentWeek);

  const today = todayKey();
  let html = "";

  for (let i = 0; i < 7; i++) {
    const date = addDays(currentWeek, i);
    const key = dateKey(date);
    const dayTasks = getDayTasks(key);

    html += `
      <article class="day-card ${key === today ? "today" : ""}"
               data-card-date="${key}">
        <div class="day-heading">
          <span class="day-name">${DAYS[i]}</span>
          <span class="day-number">${date.getDate()}</span>
        </div>

        <div class="day-list" data-list-date="${key}">
          ${dayTasks.map(task => renderTask(task, key)).join("")}
        </div>

        <button class="add-card-btn"
                data-action="add"
                data-date="${key}"
                aria-label="${key} 공부 계획 추가">+</button>
      </article>
    `;
  }

  $track.innerHTML = html;
}

function renderSomeday() {
  const list = $("somedayList");
  const position = list.scrollTop;
  const someday = getSomedayTasks();

  list.innerHTML = someday.length
    ? someday.map(task => renderTask(task, null)).join("")
    : '<div class="empty-message">아직 등록된 계획이 없어요.</div>';

  list.scrollTop = position;
}

function captureScroll() {
  const lists = {};

  $track.querySelectorAll(".day-list").forEach(element => {
    lists[element.dataset.listDate] = element.scrollTop;
  });

  return {
    horizontal: $viewport.scrollLeft,
    vertical: lists
  };
}

function renderAll(resetScroll = false, targetDate = null) {
  const saved = resetScroll ? null : captureScroll();

  renderCards();
  renderSomeday();

  if (targetDate) {
    const card = $track.querySelector(
      `[data-card-date="${targetDate}"]`
    );

    if (card) {
      $viewport.scrollLeft = Math.max(
        0, card.offsetLeft - $track.offsetLeft
      );
    }
  } else if (saved) {
    $viewport.scrollLeft = saved.horizontal;

    $track.querySelectorAll(".day-list").forEach(element => {
      element.scrollTop =
        saved.vertical[element.dataset.listDate] || 0;
    });
  } else {
    $viewport.scrollLeft = 0;
  }

  updateScrollbar();
}

/* =========================
   5. 실제 가로 스크롤바
========================= */

function updateScrollbar() {
  const visible = $viewport.clientWidth;
  const total = $viewport.scrollWidth;
  const maxScroll = Math.max(0, total - visible);

  if (maxScroll <= 1 || visible <= 0) {
    $scrollbar.hidden = true;
    return;
  }

  $scrollbar.hidden = false;

  const trackWidth = $scrollbar.clientWidth;
  const thumbWidth = Math.max(
    25, Math.min(trackWidth, trackWidth * visible / total)
  );
  const available = trackWidth - thumbWidth;
  const progress = Math.min(1, $viewport.scrollLeft / maxScroll);

  $thumb.style.width = `${thumbWidth}px`;
  $thumb.style.transform =
    `translateX(${available * progress}px)`;

  $scrollbar.setAttribute(
    "aria-valuenow", String(Math.round(progress * 100))
  );
}

let dragging = false;
let dragStartX = 0;
let dragStartScroll = 0;

function scrollbarMetrics() {
  return {
    maxScroll: Math.max(
      0, $viewport.scrollWidth - $viewport.clientWidth
    ),
    available: Math.max(
      0, $scrollbar.clientWidth - $thumb.offsetWidth
    )
  };
}

$scrollbar.addEventListener("pointerdown", event => {
  if (event.button !== 0 && event.pointerType === "mouse") return;

  const metrics = scrollbarMetrics();
  if (!metrics.available) return;

  const thumbRect = $thumb.getBoundingClientRect();

  if (event.target !== $thumb) {
    const barRect = $scrollbar.getBoundingClientRect();
    const desired = event.clientX - barRect.left -
                    $thumb.offsetWidth / 2;

    $viewport.scrollLeft =
      Math.max(0, Math.min(metrics.available, desired)) /
      metrics.available * metrics.maxScroll;
  }

  dragging = true;
  dragStartX = event.clientX;
  dragStartScroll = $viewport.scrollLeft;

  $scrollbar.classList.add("dragging");
  $scrollbar.setPointerCapture(event.pointerId);
  event.preventDefault();
});

$scrollbar.addEventListener("pointermove", event => {
  if (!dragging) return;

  const { maxScroll, available } = scrollbarMetrics();
  if (!available) return;

  const delta = event.clientX - dragStartX;
  $viewport.scrollLeft =
    dragStartScroll + delta / available * maxScroll;
});

function endDragging() {
  dragging = false;
  $scrollbar.classList.remove("dragging");
}

$scrollbar.addEventListener("pointerup", endDragging);
$scrollbar.addEventListener("pointercancel", endDragging);
$scrollbar.addEventListener("lostpointercapture", endDragging);

$viewport.addEventListener("scroll", updateScrollbar, {
  passive: true
});

// 카드 영역의 휠을 가로 이동으로 연결
$viewport.addEventListener("wheel", event => {
  if (event.target.closest(".day-list")) {
    const list = event.target.closest(".day-list");

    // 내부 목록이 세로로 스크롤 가능하면 세로 이동 우선
    if (Math.abs(event.deltaY) > Math.abs(event.deltaX) &&
        list.scrollHeight > list.clientHeight + 1) {
      return;
    }
  }

  const maxScroll =
    $viewport.scrollWidth - $viewport.clientWidth;
  if (maxScroll <= 0) return;

  const delta = event.deltaX || event.deltaY;
  const next = Math.max(
    0, Math.min(maxScroll, $viewport.scrollLeft + delta)
  );

  if (Math.abs(next - $viewport.scrollLeft) > 0.1) {
    event.preventDefault();
    $viewport.scrollLeft = next;
  }
}, { passive: false });

$scrollbar.addEventListener("keydown", event => {
  const max =
    $viewport.scrollWidth - $viewport.clientWidth;

  const commands = {
    ArrowLeft: -45,
    ArrowRight: 45,
    PageUp: -$viewport.clientWidth,
    PageDown: $viewport.clientWidth
  };

  if (event.key in commands) {
    event.preventDefault();
    $viewport.scrollLeft += commands[event.key];
  } else if (event.key === "Home") {
    event.preventDefault();
    $viewport.scrollLeft = 0;
  } else if (event.key === "End") {
    event.preventDefault();
    $viewport.scrollLeft = max;
  }
});

if (typeof ResizeObserver !== "undefined") {
  new ResizeObserver(updateScrollbar).observe($viewport);
}

window.addEventListener("resize", updateScrollbar);

/* =========================
   6. 과목 관리
========================= */

function renderSubjectOptions(selected = "General") {
  const select = $("subjectSelect");

  select.innerHTML = subjects.map(name =>
    `<option value="${escapeHTML(name)}">
      ${escapeHTML(name)}
    </option>`
  ).join("");

  select.value = subjects.includes(selected)
    ? selected : "General";
}

function renderSubjectManager() {
  $("subjectManageList").innerHTML = subjects.map(name => `
    <div class="subject-manage-item">
      <span>${escapeHTML(name)}</span>
      ${name === "General"
        ? '<span>Default</span>'
        : `<button type="button" class="subject-remove"
             data-remove-subject="${escapeHTML(name)}"
             aria-label="${escapeHTML(name)} 과목 삭제">Delete</button>`
      }
    </div>
  `).join("");
}

function toggleSubjectPanel(panelId) {
  const add = $("subjectAddPanel");
  const manage = $("subjectManagePanel");
  const panel = $(panelId);
  const opening = panel.hidden;

  add.hidden = true;
  manage.hidden = true;

  panel.hidden = !opening;

  if (opening && panelId === "subjectAddPanel") {
    $("newSubjectInput").focus();
  }

  if (opening && panelId === "subjectManagePanel") {
    renderSubjectManager();
  }
}

function addSubject() {
  const input = $("newSubjectInput");
  const name = input.value.trim();
  const error = $("formError");

  error.textContent = "";

  if (!name) {
    error.textContent = "과목 이름을 입력해 주세요.";
    input.focus();
    return;
  }

  if (name.length > 30) {
    error.textContent = "과목 이름은 30자 이하로 입력해 주세요.";
    return;
  }

  if (subjects.some(s =>
    s.toLocaleLowerCase() === name.toLocaleLowerCase()
  )) {
    error.textContent = "이미 등록된 과목이에요.";
    return;
  }

  subjects.push(name);
  saveData();

  renderSubjectOptions(name);
  renderSubjectManager();
  input.value = "";
  $("subjectAddPanel").hidden = true;

  toast("과목이 추가되었어요.");
}

function removeSubject(name) {
  if (name === "General" || !subjects.includes(name)) return;

  showConfirmation(
    `"${name}" 과목을 삭제할까요?\n기존 공부 계획의 과목은 General로 변경돼요.`,
    [
      { label: "Cancel" },
      {
        label: "Delete",
        primary: true,
        action: () => {
          subjects = subjects.filter(s => s !== name);

          tasks.forEach(task => {
            if (task.subject === name) {
              task.subject = "General";
              task.updatedAt = new Date().toISOString();
            }
          });

          saveData();
          renderSubjectOptions("General");
          renderSubjectManager();
          renderAll();
          toast("과목이 삭제되었어요.");
        }
      }
    ]
  );
}

/* =========================
   7. 모달 및 날짜 선택
========================= */

function syncDateMode() {
  const mode = $("dateMode").value;
  const dateInput = $("dateInput");
  const repeat = $("repeatSelect");

  if (mode === "today") {
    dateInput.value = todayKey();
  } else if (mode === "tomorrow") {
    dateInput.value = dateKey(addDays(new Date(), 1));
  } else if (mode === "someday") {
    dateInput.value = "";
  } else if (!dateInput.value) {
    dateInput.value = todayKey();
  }

  dateInput.hidden = mode !== "choose";

  const isSomeday = mode === "someday";
  if (isSomeday) repeat.value = "none";
  repeat.disabled = isSomeday;
}

function openModal(id = null, occurrence = null, defaultDate = null) {
  const task = tasks.find(item => item.id === id);

  editingId = task ? task.id : null;
  editingOccurrence = occurrence;

  previousFocus = document.activeElement;

  $("studyForm").reset();
  $("formError").textContent = "";
  $("subjectAddPanel").hidden = true;
  $("subjectManagePanel").hidden = true;
  $("newSubjectInput").value = "";

  $("modalTitle").textContent =
    task ? "Edit Study Plan" : "New Study Plan";
  $("deleteTask").hidden = !task;

  $("taskInput").value = task ? task.title : "";
  renderSubjectOptions(task ? task.subject : "General");

  $("repeatSelect").value = task ? task.repeat : "none";

  const date = task ? task.date : defaultDate;

  if (date === null && (task || defaultDate === null)) {
    $("dateMode").value = "someday";
    $("dateInput").value = "";
  } else {
    $("dateMode").value = "choose";
    $("dateInput").value = date || todayKey();
  }

  syncDateMode();

  $("somedayPanel").hidden = true;
  $("somedayToggle").setAttribute("aria-expanded", "false");
  $("modalOverlay").hidden = false;
  $("taskInput").focus();
}

function closeModal() {
  $("modalOverlay").hidden = true;
  editingId = null;
  editingOccurrence = null;

  if (previousFocus && previousFocus.isConnected) {
    previousFocus.focus();
  }
  previousFocus = null;
}

function selectedDate() {
  const mode = $("dateMode").value;

  if (mode === "someday") return null;
  if (mode === "today") return todayKey();

  if (mode === "tomorrow") {
    return dateKey(addDays(new Date(), 1));
  }

  return $("dateInput").value;
}

function navigateToDate(key) {
  if (!key) return renderAll();

  const newWeek = startOfWeek(fromKey(key));
  currentWeek = newWeek;
  renderAll(true, key);
}

/* =========================
   8. 공부 계획 등록 및 수정
========================= */

function saveStudyPlan(event) {
  event.preventDefault();

  const title = $("taskInput").value.trim();
  const date = selectedDate();
  const subject = $("subjectSelect").value;
  const repeat = date === null
    ? "none" : $("repeatSelect").value;
  const error = $("formError");

  error.textContent = "";

  if (!title) {
    error.textContent = "Study Task를 입력해 주세요.";
    $("taskInput").focus();
    return;
  }

  if (title.length > 120) {
    error.textContent = "120자 이하로 입력해 주세요.";
    return;
  }

  if (date !== null && !validDate(date)) {
    error.textContent = "올바른 날짜를 선택해 주세요.";
    return;
  }

  if (!subjects.includes(subject)) {
    error.textContent = "올바른 과목을 선택해 주세요.";
    return;
  }

  const now = new Date().toISOString();
  const task = tasks.find(item => item.id === editingId);

  let shouldNavigate = false;

  if (task) {
    const oldDate = task.date;
    const oldRepeat = task.repeat;

    task.title = title;
    task.date = date;
    task.subject = subject;
    task.repeat = repeat;
    task.updatedAt = now;

    // 기존 완료 기록은 변경하지 않음
    if (date === null && oldDate !== null) {
      task.completed = false;
    }

    if (oldDate !== date || oldRepeat !== repeat) {
      // 변경된 규칙에서도 기존 완료 기록은 보존
      shouldNavigate = oldDate !== date;
    }

    toast("공부 계획이 수정되었어요.");
  } else {
    tasks.push({
      id: uid(),
      title,
      date,
      subject,
      repeat,
      completed: false,
      completions: {},
      exceptions: {},
      createdAt: now,
      updatedAt: now
    });

    toast("공부 계획이 추가되었어요 ♡");
  }

  saveData();
  closeModal();

  if (date === null) {
    renderAll();
    $("somedayPanel").hidden = false;
    $("somedayToggle").setAttribute("aria-expanded", "true");
  } else if (shouldNavigate ||
             !isDateInCurrentWeek(date)) {
    navigateToDate(date);
  } else {
    renderAll();
  }
}

function isDateInCurrentWeek(key) {
  return key >= dateKey(currentWeek) &&
         key <= dateKey(addDays(currentWeek, 6));
}

/* =========================
   9. 완료 및 삭제
========================= */

function toggleComplete(id, key, checked) {
  const task = tasks.find(item => item.id === id);
  if (!task) return;

  if (task.repeat !== "none" && key) {
    if (checked) task.completions[key] = true;
    else delete task.completions[key];
  } else {
    task.completed = checked;
  }

  task.updatedAt = new Date().toISOString();

  saveData();
  renderAll();
}

function showConfirmation(message, buttons) {
  const container = $("confirmActions");
  const messageElement = $("confirmMessage");

  pendingConfirmation = buttons;
  messageElement.textContent = message;
  messageElement.style.whiteSpace = "pre-line";
  container.innerHTML = "";

  buttons.forEach((option, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = option.label;
    button.dataset.confirmIndex = index;

    if (option.primary) button.classList.add("primary");
    container.appendChild(button);
  });

  $("confirmOverlay").hidden = false;
  container.querySelector("button")?.focus();
}

function closeConfirmation() {
  $("confirmOverlay").hidden = true;
  pendingConfirmation = null;
}

function deleteStudyPlan() {
  const task = tasks.find(item => item.id === editingId);
  if (!task) return;

  const id = task.id;
  const occurrence = editingOccurrence;

  if (task.repeat !== "none") {
    showConfirmation("반복 공부 계획을 어떻게 삭제할까요?", [
      { label: "Cancel" },
      {
        label: "This occurrence",
        action: () => {
          if (!occurrence) return;
          task.exceptions[occurrence] = true;
          task.updatedAt = new Date().toISOString();

          saveData();
          closeModal();
          renderAll();
          toast("해당 날짜의 계획이 삭제되었어요.");
        }
      },
      {
        label: "Entire task",
        primary: true,
        action: () => removeEntireTask(id)
      }
    ]);
  } else {
    showConfirmation("이 공부 계획을 삭제할까요?", [
      { label: "Cancel" },
      {
        label: "Delete",
        primary: true,
        action: () => removeEntireTask(id)
      }
    ]);
  }
}

function removeEntireTask(id) {
  tasks = tasks.filter(task => task.id !== id);

  saveData();
  closeModal();
  renderAll();
  toast("공부 계획이 삭제되었어요.");
}

/* =========================
   10. 클릭 이벤트
========================= */

$("prevWeek").addEventListener("click", () => {
  currentWeek = addDays(currentWeek, -7);
  renderAll(true);
});

$("nextWeek").addEventListener("click", () => {
  currentWeek = addDays(currentWeek, 7);
  renderAll(true);
});

$("somedayToggle").addEventListener("click", () => {
  const panel = $("somedayPanel");
  panel.hidden = !panel.hidden;

  $("somedayToggle").setAttribute(
    "aria-expanded", String(!panel.hidden)
  );

  if (!panel.hidden) renderSomeday();
});

$("closeSomeday").addEventListener("click", () => {
  $("somedayPanel").hidden = true;
  $("somedayToggle").setAttribute("aria-expanded", "false");
});

$("addSomeday").addEventListener("click", () => {
  openModal(null, null, null);
});

function handleTaskClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const { action, id, date } = button.dataset;

  if (action === "add") {
    openModal(null, null, date);
  } else if (action === "edit") {
    openModal(id, date || null);
  }
}

function handleTaskChange(event) {
  if (!event.target.matches('[data-action="complete"]')) return;

  const { id, date } = event.target.dataset;
  toggleComplete(id, date || null, event.target.checked);
}

$track.addEventListener("click", handleTaskClick);
$track.addEventListener("change", handleTaskChange);

$("somedayList").addEventListener("click", handleTaskClick);
$("somedayList").addEventListener("change", handleTaskChange);

$("dateMode").addEventListener("change", syncDateMode);
$("studyForm").addEventListener("submit", saveStudyPlan);

$("cancelModal").addEventListener("click", closeModal);
$("closeModal").addEventListener("click", closeModal);
$("deleteTask").addEventListener("click", deleteStudyPlan);

$("addSubjectToggle").addEventListener("click", () => {
  toggleSubjectPanel("subjectAddPanel");
});

$("manageSubjectToggle").addEventListener("click", () => {
  toggleSubjectPanel("subjectManagePanel");
});

$("saveSubject").addEventListener("click", addSubject);

$("newSubjectInput").addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    addSubject();
  }
});

$("subjectManageList").addEventListener("click", event => {
  const button = event.target.closest("[data-remove-subject]");
  if (button) removeSubject(button.dataset.removeSubject);
});

$("confirmActions").addEventListener("click", event => {
  const button = event.target.closest("[data-confirm-index]");
  if (!button || !pendingConfirmation) return;

  const option = pendingConfirmation[
    Number(button.dataset.confirmIndex)
  ];

  closeConfirmation();
  if (option && option.action) option.action();
});

// 모달 바깥 영역 클릭 시 닫기
$("modalOverlay").addEventListener("click", event => {
  if (event.target === $("modalOverlay")) closeModal();
});

// Escape 및 모달 내 Tab 포커스 관리
document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    if (!$("confirmOverlay").hidden) {
      closeConfirmation();
    } else if (!$("modalOverlay").hidden) {
      closeModal();
    } else if (!$("somedayPanel").hidden) {
      $("somedayPanel").hidden = true;
      $("somedayToggle").setAttribute("aria-expanded", "false");
    }
    return;
  }

  if (event.key !== "Tab") return;

  const activeDialog = !$("confirmOverlay").hidden
    ? $("confirmOverlay")
    : !$("modalOverlay").hidden
      ? $("modalOverlay")
      : null;

  if (!activeDialog) return;

  const focusable = Array.from(activeDialog.querySelectorAll(
    'button:not([disabled]), input:not([disabled]), ' +
    'select:not([disabled]), [tabindex="0"]'
  )).filter(element => {
    return element.getClientRects().length > 0;
  });

  if (!focusable.length) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey &&
             document.activeElement === last) {
    event.preventDefault();
    first.focus();
  } else if (!activeDialog.contains(document.activeElement)) {
    event.preventDefault();
    first.focus();
  }
});

/* =========================
   11. 초기 실행
========================= */

loadData();
renderAll(true);

if (!storageAvailable) {
  toast("저장소를 사용할 수 없어요. 브라우저 설정을 확인해 주세요.");
}
