
/* ==============================
   Cinema Notes
============================== */

const STORAGE_KEY = "cinemaNotes_v1";


/* ==============================
   Elements
============================== */

const quoteList = document.getElementById("quoteList");
const emptyState = document.getElementById("emptyState");

const addBtn = document.getElementById("addBtn");

const modalOverlay = document.getElementById("modalOverlay");
const modalTitle = document.getElementById("modalTitle");

const closeModalBtn = document.getElementById("closeModalBtn");
const cancelBtn = document.getElementById("cancelBtn");

const quoteForm = document.getElementById("quoteForm");

const quoteInput = document.getElementById("quoteInput");
const movieInput = document.getElementById("movieInput");
const yearInput = document.getElementById("yearInput");

const deleteBtn = document.getElementById("deleteBtn");


/* ==============================
   State
============================== */

let quotes = [];
let editingId = null;
let previousFocus = null;


/* ==============================
   Sample Data

   아래 문장은 기능 확인용 예시입니다.
   실제 영화 대사 인용이 아닙니다.
============================== */

const sampleQuotes = [
  {
    id: "sample-1",
    text: "평범한 하루가 가장 소중해.",
    movie: "어바웃 타임",
    year: "2013",
    favorite: false
  },
  {
    id: "sample-2",
    text: "네가 원하는 삶을 살아.",
    movie: "리틀 포레스트",
    year: "2018",
    favorite: true
  },
  {
    id: "sample-3",
    text: "오늘도 충분히 아름다워.",
    movie: "소울",
    year: "2020",
    favorite: false
  }
];


/* ==============================
   Storage
============================== */

function loadQuotes() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved !== null) {
      const parsed = JSON.parse(saved);

      if (Array.isArray(parsed)) {
        quotes = parsed;
        return;
      }
    }
  } catch (error) {
    console.warn("저장된 데이터를 불러오지 못했습니다.", error);
  }

  quotes = sampleQuotes.map(item => ({ ...item }));
  saveQuotes();
}


function saveQuotes() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(quotes)
    );
  } catch (error) {
    console.warn("데이터 저장에 실패했습니다.", error);
  }
}


/* ==============================
   ID Generator
============================== */

function generateId() {
  if (window.crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return Date.now().toString(36)
    + Math.random().toString(36).slice(2);
}


/* ==============================
   HTML Escape
============================== */

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* ==============================
   Render
============================== */

function render() {
  quoteList.innerHTML = "";

  const isEmpty = quotes.length === 0;

  quoteList.hidden = isEmpty;
  emptyState.hidden = !isEmpty;

  if (isEmpty) {
    return;
  }

  quotes.forEach(item => {
    const quoteItem = document.createElement("article");

    quoteItem.className = "quote-item";

    quoteItem.innerHTML = `
      <div class="quote-content"
           role="button"
           tabindex="0"
           title="클릭하여 수정">

        <p class="quote-text">
          ${escapeHTML(item.text)}
        </p>

        <div class="quote-meta">

          <span class="meta-tag movie-tag">
            <span class="movie-icon">🎬</span>
            ${escapeHTML(item.movie)}
          </span>

          ${
            item.year
              ? `<span class="meta-tag">
                   ${escapeHTML(item.year)}
                 </span>`
              : ""
          }

        </div>

      </div>

      <button
        class="bookmark-btn ${item.favorite ? "active" : ""}"
        type="button"
        aria-label="${item.favorite ? "즐겨찾기 해제" : "즐겨찾기"}"
        aria-pressed="${Boolean(item.favorite)}"
        title="Favorite"
      >
        ${item.favorite ? "♥" : "♡"}
      </button>
    `;

    const content = quoteItem.querySelector(".quote-content");
    const bookmarkBtn = quoteItem.querySelector(".bookmark-btn");

    content.addEventListener("click", () => {
      openEditModal(item.id);
    });

    content.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openEditModal(item.id);
      }
    });

    bookmarkBtn.addEventListener("click", () => {
      toggleFavorite(item.id);
    });

    quoteList.appendChild(quoteItem);
  });
}


/* ==============================
   Favorite
============================== */

function toggleFavorite(id) {
  const item = quotes.find(quote => quote.id === id);

  if (!item) return;

  item.favorite = !item.favorite;

  saveQuotes();
  render();
}


/* ==============================
   Open Add Modal
============================== */

function openAddModal() {
  editingId = null;

  quoteForm.reset();

  modalTitle.textContent = "Add a little line";

  deleteBtn.hidden = true;

  openModal();
}


/* ==============================
   Open Edit Modal
============================== */

function openEditModal(id) {
  const item = quotes.find(quote => quote.id === id);

  if (!item) return;

  editingId = id;

  quoteInput.value = item.text;
  movieInput.value = item.movie;
  yearInput.value = item.year || "";

  modalTitle.textContent = "Edit this line";

  deleteBtn.hidden = false;

  openModal();
}


/* ==============================
   Modal Controls
============================== */

function openModal() {
  previousFocus = document.activeElement;

  modalOverlay.hidden = false;

  requestAnimationFrame(() => {
    quoteInput.focus();
  });
}


function closeModal() {
  modalOverlay.hidden = true;

  editingId = null;

  quoteForm.reset();

  if (previousFocus && previousFocus.isConnected) {
    previousFocus.focus();
  } else {
    addBtn.focus();
  }

  previousFocus = null;
}


/* ==============================
   Save Quote
============================== */

function handleSubmit(event) {
  event.preventDefault();

  const text = quoteInput.value.trim();
  const movie = movieInput.value.trim();
  const year = yearInput.value.trim();

  if (!text || !movie) {
    return;
  }

  if (editingId) {
    const item = quotes.find(
      quote => quote.id === editingId
    );

    if (!item) return;

    item.text = text;
    item.movie = movie;
    item.year = year;

  } else {

    const newQuote = {
      id: generateId(),
      text,
      movie,
      year,
      favorite: false
    };

    // 새로 추가한 명언을 맨 위에 표시
    quotes.unshift(newQuote);
  }

  saveQuotes();
  render();

  // 새 명언을 볼 수 있도록 맨 위로 이동
  quoteList.scrollTop = 0;

  closeModal();
}


/* ==============================
   Delete Quote
============================== */

function deleteQuote() {
  if (!editingId) return;

  const item = quotes.find(
    quote => quote.id === editingId
  );

  if (!item) return;

  // 삭제 버튼을 다시 눌러 확인
  if (deleteBtn.dataset.confirm !== "true") {
    deleteBtn.dataset.confirm = "true";
    deleteBtn.textContent = "Delete?";
    return;
  }

  quotes = quotes.filter(
    quote => quote.id !== editingId
  );

  saveQuotes();
  render();

  resetDeleteButton();
  closeModal();
}


function resetDeleteButton() {
  deleteBtn.dataset.confirm = "false";
  deleteBtn.textContent = "Delete";
}


/* ==============================
   Events
============================== */

addBtn.addEventListener("click", () => {
  resetDeleteButton();
  openAddModal();
});

closeModalBtn.addEventListener("click", closeModal);
cancelBtn.addEventListener("click", closeModal);

quoteForm.addEventListener("submit", handleSubmit);

deleteBtn.addEventListener("click", deleteQuote);


// 모달 바깥 클릭 시 닫기
modalOverlay.addEventListener("click", event => {
  if (event.target === modalOverlay) {
    closeModal();
  }
});


// ESC 키로 닫기
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !modalOverlay.hidden) {
    closeModal();
  }

  if (
    event.key === "Tab" &&
    !modalOverlay.hidden
  ) {
    const focusable = Array.from(
      modalOverlay.querySelectorAll(
        'button:not([hidden]), input, textarea'
      )
    ).filter(element => !element.disabled);

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
  }
});


/* ==============================
   Initialize
============================== */

loadQuotes();
resetDeleteButton();
render();
