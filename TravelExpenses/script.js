const STORAGE_KEY = "travelExpenses_v1";

const CATEGORIES = [
  "교통",
  "숙박",
  "식비",
  "카페",
  "관광",
  "쇼핑",
  "기타"
];

const CATEGORY_ICONS = {
  "교통": "🚆",
  "숙박": "🛌🏻",
  "식비": "🍽️",
  "카페": "☕",
  "관광": "🎡",
  "쇼핑": "🛍️",
  "기타": "🧸"
};

const $ = (id) => document.getElementById(id);

const createId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const today = () => {
  const now = new Date();
  const local = new Date(
    now.getTime() - now.getTimezoneOffset() * 60000
  );

  return local.toISOString().slice(0, 10);
};

const money = (value) => {
  return Math.round(Number(value) || 0)
    .toLocaleString("ko-KR") + "원";
};

function defaultData() {
  const id = createId();

  return {
    activeTripId: id,
    trips: [
      {
        id,
        name: "나의 첫 여행",
        budget: 0,
        expenses: []
      }
    ]
  };
}

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return defaultData();

    const parsed = JSON.parse(saved);

    if (
      !parsed ||
      !Array.isArray(parsed.trips) ||
      parsed.trips.length === 0
    ) {
      return defaultData();
    }

    parsed.trips = parsed.trips.filter(
      trip => trip && typeof trip.id === "string"
    );

    if (parsed.trips.length === 0) {
      return defaultData();
    }

    parsed.trips.forEach(trip => {
      if (!Array.isArray(trip.expenses)) {
        trip.expenses = [];
      }

      trip.budget = Math.max(
        0,
        Number(trip.budget) || 0
      );
    });

    if (
      !parsed.trips.some(
        trip => trip.id === parsed.activeTripId
      )
    ) {
      parsed.activeTripId = parsed.trips[0].id;
    }

    return parsed;
  } catch (error) {
    console.error("저장 데이터 불러오기 실패:", error);
    return defaultData();
  }
}

let data = loadData();
let tripFormMode = "add";

function saveData() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(data)
    );

    return true;
  } catch (error) {
    console.error("저장 실패:", error);
    return false;
  }
}

function currentTrip() {
  return data.trips.find(
    trip => trip.id === data.activeTripId
  );
}

/* XSS 방지용 문자 처리 */

function escapeHTML(value) {
  return String(value).replace(
    /[&<>"']/g,
    char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]
  );
}

/* 여행 선택 목록 */

function renderTripSelect() {
  const select = $("tripSelect");

  select.innerHTML = data.trips.map(trip => `
    <option value="${escapeHTML(trip.id)}">
      ${escapeHTML(trip.name)}
    </option>
  `).join("");

  select.value = data.activeTripId;
}

/* 예산 계산 */

function getTotalSpent(trip) {
  return trip.expenses.reduce(
    (sum, expense) => {
      return sum + (Number(expense.amount) || 0);
    },
    0
  );
}

function renderBudget() {
  const trip = currentTrip();

  const budget = Number(trip.budget) || 0;
  const spent = getTotalSpent(trip);
  const remaining = budget - spent;

  const percent = budget > 0
    ? (spent / budget) * 100
    : 0;

  $("totalBudget").textContent = money(budget);
  $("spentAmount").textContent = money(spent);
  $("remainingAmount").textContent = money(remaining);

  $("usagePercent").textContent =
    `${Math.round(percent)}%`;

  $("progressBar").style.width =
    `${Math.min(100, Math.max(0, percent))}%`;

  $("remainingAmount").style.color =
    remaining < 0 ? "#aa7777" : "#444444";
}

/* 카테고리별 지출 */

function renderCategories() {
  const trip = currentTrip();
  const container = $("categorySummary");

  const totals = {};

  CATEGORIES.forEach(category => {
    totals[category] = 0;
  });

  trip.expenses.forEach(expense => {
    const category = CATEGORIES.includes(expense.category)
      ? expense.category
      : "기타";

    totals[category] += Number(expense.amount) || 0;
  });

  const activeCategories = CATEGORIES.filter(
    category => totals[category] > 0
  );

  if (activeCategories.length === 0) {
    container.innerHTML = `
      <p style="color:#aaaaaa;font-size:13px;margin:0">
        지출을 등록하면 카테고리별 금액이 표시돼요.
      </p>
    `;
    return;
  }

  const maxAmount = Math.max(
    ...activeCategories.map(category => totals[category])
  );

  container.innerHTML = activeCategories.map(category => {
    const amount = totals[category];
    const percent = maxAmount > 0
      ? (amount / maxAmount) * 100
      : 0;

    return `
      <div class="category-item">
        <span class="category-name">
          ${escapeHTML(category)}
        </span>

        <div class="category-track">
          <div
            class="category-fill"
            style="width:${percent}%"
          ></div>
        </div>

        <span class="category-amount">
          ${money(amount)}
        </span>
      </div>
    `;
  }).join("");
}

/* 지출 목록 */

function renderExpenses() {
  const trip = currentTrip();
  const list = $("expenseList");
  const empty = $("emptyMessage");

  const expenses = [...trip.expenses].sort((a, b) => {
    const dateCompare = String(b.startDate || b.date || "")
      .localeCompare(String(a.startDate || a.date || ""));

    if (dateCompare !== 0) return dateCompare;

    return String(b.id).localeCompare(String(a.id));
  });

  $("expenseCount").textContent =
    `${expenses.length}건`;

  empty.classList.toggle(
    "hidden",
    expenses.length > 0
  );

  list.innerHTML = expenses.map(expense => {
    const category = CATEGORIES.includes(expense.category)
      ? expense.category
      : "기타";

    return `
      <article class="expense-item">
        <div class="expense-icon">
          ${CATEGORY_ICONS[category]}
        </div>

        <div class="expense-info">
          <div class="expense-name">
            ${escapeHTML(expense.name)}
          </div>

          <div class="expense-meta">
            <span>${escapeHTML(category)}</span>
            <span>·</span>
            <span>${escapeHTML(formatExpenseDate(expense))}</span>
          </div>
        </div>

        <div class="expense-amount">
          ${money(expense.amount)}
        </div>

        <div class="expense-buttons">
          <button
            type="button"
            class="small-btn"
            data-action="edit"
            data-id="${escapeHTML(expense.id)}"
            aria-label="지출 수정"
          >수정</button>

          <button
            type="button"
            class="small-btn"
            data-action="delete"
            data-id="${escapeHTML(expense.id)}"
            aria-label="지출 삭제"
          >삭제</button>
        </div>
      </article>
    `;
  }).join("");
}

/* 전체 새로고침 */

function render() {
  renderTripSelect();
  renderBudget();
  renderCategories();
  renderExpenses();
}

/* 여행 추가 및 수정 */

function openTripForm(mode) {
  tripFormMode = mode;

  $("deleteConfirm").classList.add("hidden");
  $("tripForm").classList.remove("hidden");

  if (mode === "edit") {
    const trip = currentTrip();

    $("tripFormTitle").textContent = "여행 정보 수정";
    $("tripName").value = trip.name;
    $("tripBudget").value = trip.budget;
  } else {
    $("tripFormTitle").textContent = "새 여행 등록";
    $("tripName").value = "";
    $("tripBudget").value = "";
  }

  $("tripName").focus();
}

$("addTripBtn").addEventListener("click", () => {
  openTripForm("add");
});

$("editTripBtn").addEventListener("click", () => {
  openTripForm("edit");
});

$("cancelTripBtn").addEventListener("click", () => {
  $("tripForm").classList.add("hidden");
});

$("tripForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const name = $("tripName").value.trim();
  const budget = Number($("tripBudget").value);

  if (
    !name ||
    !Number.isSafeInteger(budget) ||
    budget < 0
  ) {
    return;
  }

  if (tripFormMode === "edit") {
    const trip = currentTrip();

    trip.name = name;
    trip.budget = budget;
  } else {
    const id = createId();

    data.trips.push({
      id,
      name,
      budget,
      expenses: []
    });

    data.activeTripId = id;
  }

  saveData();
  $("tripForm").classList.add("hidden");

  resetExpenseForm();
  render();
});

/* 여행 전환 */

$("tripSelect").addEventListener("change", (event) => {
  data.activeTripId = event.target.value;

  saveData();

  $("tripForm").classList.add("hidden");
  $("deleteConfirm").classList.add("hidden");

  resetExpenseForm();
  render();
});

/* 여행 삭제 */

$("deleteTripBtn").addEventListener("click", () => {
  $("tripForm").classList.add("hidden");
  $("deleteConfirm").classList.remove("hidden");
});

$("cancelDeleteBtn").addEventListener("click", () => {
  $("deleteConfirm").classList.add("hidden");
});

$("confirmDeleteBtn").addEventListener("click", () => {
  const deletedId = data.activeTripId;

  data.trips = data.trips.filter(
    trip => trip.id !== deletedId
  );

  if (data.trips.length === 0) {
    const newTrip = {
      id: createId(),
      name: "나의 첫 여행",
      budget: 0,
      expenses: []
    };

    data.trips.push(newTrip);
  }

  data.activeTripId = data.trips[0].id;

  saveData();

  $("deleteConfirm").classList.add("hidden");

  resetExpenseForm();
  render();
});

/* ==============================
   지출 모달 관리
============================== */

const expenseModal = $("expenseModal");

let previousFocus = null;

function openExpenseModal() {
  previousFocus = document.activeElement;

  expenseModal.classList.remove("hidden");

  document.body.style.overflow = "hidden";

  $("expenseName").focus();
}

function closeExpenseModal() {
  expenseModal.classList.add("hidden");

  document.body.style.overflow = "";

  resetExpenseForm();

  if (
    previousFocus &&
    document.contains(previousFocus)
  ) {
    previousFocus.focus();
  }

  previousFocus = null;
}


/* ==============================
   지출 폼 초기화
============================== */

function resetExpenseForm() {
  $("expenseForm").reset();

  $("editExpenseId").value = "";

  $("expenseStartDate").value = today();
  $("expenseEndDate").value = "";
  $("expenseEndDate").setCustomValidity("");

  $("expenseFormTitle").textContent = "새 지출 추가";
  $("saveExpenseBtn").textContent = "저장하기";
}


/* ==============================
   모달 열기
============================== */

$("openExpenseBtn").addEventListener("click", () => {
  resetExpenseForm();
  openExpenseModal();
});


/* ==============================
   모달 닫기
============================== */

$("closeExpenseModalBtn").addEventListener(
  "click",
  closeExpenseModal
);

$("cancelExpenseBtn").addEventListener(
  "click",
  closeExpenseModal
);


/* 모달 바깥 영역 클릭 시 닫기 */

expenseModal.addEventListener("click", (event) => {
  if (event.target === expenseModal) {
    closeExpenseModal();
  }
});


/* ESC 키로 모달 닫기, Tab 포커스 유지 */

document.addEventListener("keydown", (event) => {
  if (expenseModal.classList.contains("hidden")) {
    return;
  }

  if (event.key === "Escape") {
    closeExpenseModal();
    return;
  }

  if (event.key !== "Tab") return;

  const focusable = Array.from(
    expenseModal.querySelectorAll(
      "button:not(:disabled), input:not(:disabled), select:not(:disabled)"
    )
  ).filter(el => el.getClientRects().length > 0);

  if (!focusable.length) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (
    !event.shiftKey &&
    document.activeElement === last
  ) {
    event.preventDefault();
    first.focus();
  }
});


/* ==============================
   지출 추가 및 수정
============================== */

$("expenseForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const trip = currentTrip();

  const id = $("editExpenseId").value;
  const name = $("expenseName").value.trim();
  const category = $("expenseCategory").value;

  const startDate = $("expenseStartDate").value;
  const endDate = $("expenseEndDate").value;

  const amount = Number($("expenseAmount").value);

  if (
    !name ||
    !startDate ||
    !CATEGORIES.includes(category) ||
    !Number.isSafeInteger(amount) ||
    amount <= 0
  ) {
    return;
  }

  if (endDate && endDate < startDate) {
    $("expenseEndDate").setCustomValidity(
      "종료일은 시작일 이후여야 해요."
    );
    $("expenseEndDate").reportValidity();
    return;
  }

  $("expenseEndDate").setCustomValidity("");

  if (id) {
    const expense = trip.expenses.find(
      item => item.id === id
    );

    if (!expense) return;

    expense.name = name;
    expense.category = category;
    expense.startDate = startDate;
    expense.endDate = endDate;
    expense.amount = amount;

    delete expense.date;
  } else {
    trip.expenses.push({
      id: createId(),
      name,
      category,
      startDate,
      endDate,
      amount
    });
  }

  if (!saveData()) {
    console.error("지출 내역 저장 실패");
    return;
  }

  render();
  closeExpenseModal();
});


/* ==============================
   지출 수정 및 삭제
============================== */

$("expenseList").addEventListener("click", (event) => {
  const button = event.target.closest(
    "button[data-action]"
  );

  if (!button) return;

  const trip = currentTrip();

  const id = button.dataset.id;
  const action = button.dataset.action;

  const expense = trip.expenses.find(
    item => item.id === id
  );

  if (!expense) return;

  /* 지출 삭제 */

  if (action === "delete") {
    trip.expenses = trip.expenses.filter(
      item => item.id !== id
    );

    saveData();
    render();
    return;
  }

  /* 지출 수정 */

  if (action === "edit") {
    $("editExpenseId").value = expense.id;

    $("expenseName").value = expense.name;
    $("expenseCategory").value = expense.category;
    $("expenseStartDate").value =
      expense.startDate || expense.date || "";

    $("expenseEndDate").value =
      expense.endDate || "";

    $("expenseEndDate").setCustomValidity("");
    $("expenseAmount").value = expense.amount;

    $("expenseFormTitle").textContent = "지출 내역 수정";
    $("saveExpenseBtn").textContent = "변경사항 저장";

    openExpenseModal();
  }
});

function formatExpenseDate(expense) {
  // 기존 단일 날짜 데이터도 지원
  const start = expense.startDate || expense.date || "";
  const end = expense.endDate || "";

  const format = (date) => date.replaceAll("-", ".");

  if (!start) return "날짜 미설정";

  if (!end || start === end) {
    return format(start);
  }

  return `${format(start)} ~ ${format(end)}`;
}

/* ==============================
   초기 실행
============================== */

resetExpenseForm();
render();