
"use strict";

/* ==========================================
   MY LITTLE LIBRARY
   Complete JavaScript
========================================== */

/* Configuration */

const STORAGE_KEY = "myLittleLibraryBooks_v1";
const GOAL_KEY = "myLittleLibraryGoals_v1";

const COVER_DB_NAME = "MyLittleLibraryCovers";
const COVER_DB_VERSION = 1;
const COVER_STORE_NAME = "covers";

const DEFAULT_GOAL = 12;

/* State */

let books = loadBooks();
let goals = loadGoals();

let currentView = "bookshelf";
let selectedBookId = null;
let editingBookId = null;

let selectedYear = new Date().getFullYear();

let selectedCoverFile = null;
let removeCurrentCover = false;
let coverPreviewURL = null;

let toastTimer = null;
let pendingDeleteId = null;
let deleteTimer = null;

const $ = id => document.getElementById(id);

/* ==========================================
   Local Storage
========================================== */

function loadBooks() {
    try {
        const data = JSON.parse(
            localStorage.getItem(STORAGE_KEY) || "[]"
        );

        if (!Array.isArray(data)) return [];

        return data.filter(book =>
            book &&
            typeof book.id === "string" &&
            typeof book.title === "string"
        );

    } catch (error) {
        console.error("Book loading failed:", error);
        return [];
    }
}

function saveBooks() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(books)
        );

        return true;

    } catch (error) {
        console.error("Book saving failed:", error);
        showToast("데이터 저장에 실패했어요.");
        return false;
    }
}

function loadGoals() {
    try {
        const data = JSON.parse(
            localStorage.getItem(GOAL_KEY) || "{}"
        );

        return data && typeof data === "object"
            ? data
            : {};

    } catch {
        return {};
    }
}

function saveGoals() {
    try {
        localStorage.setItem(
            GOAL_KEY,
            JSON.stringify(goals)
        );

        return true;

    } catch (error) {
        console.error(error);
        showToast("독서 목표를 저장하지 못했어요.");
        return false;
    }
}

/* ==========================================
   IndexedDB
========================================== */

function openCoverDB() {
    return new Promise((resolve, reject) => {

        if (!window.indexedDB) {
            reject(new Error(
                "이 브라우저에서는 이미지 저장을 지원하지 않아요."
            ));
            return;
        }

        const request = indexedDB.open(
            COVER_DB_NAME,
            COVER_DB_VERSION
        );

        request.onupgradeneeded = event => {
            const db = event.target.result;

            if (!db.objectStoreNames.contains(COVER_STORE_NAME)) {
                db.createObjectStore(COVER_STORE_NAME);
            }
        };

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject(request.error || new Error(
                "이미지 저장소를 열 수 없어요."
            ));
        };

        request.onblocked = () => {
            reject(new Error(
                "이미지 저장소가 잠겨 있어요."
            ));
        };
    });
}

async function saveCoverImage(bookId, blob) {
    const db = await openCoverDB();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(
            COVER_STORE_NAME,
            "readwrite"
        );

        tx.objectStore(COVER_STORE_NAME).put(
            blob,
            bookId
        );

        tx.oncomplete = () => {
            db.close();
            resolve();
        };

        tx.onerror = () => {
            reject(tx.error);
        };

        tx.onabort = () => {
            reject(tx.error);
        };
    }).finally(() => {
        db.close();
    });
}

async function getCoverImage(bookId) {
    const db = await openCoverDB();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(
            COVER_STORE_NAME,
            "readonly"
        );

        const request = tx
            .objectStore(COVER_STORE_NAME)
            .get(bookId);

        request.onsuccess = () => {
            resolve(request.result || null);
        };

        request.onerror = () => {
            reject(request.error);
        };

        tx.oncomplete = () => {
            db.close();
        };
    });
}

async function deleteCoverImage(bookId) {
    const db = await openCoverDB();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(
            COVER_STORE_NAME,
            "readwrite"
        );

        tx.objectStore(COVER_STORE_NAME).delete(bookId);

        tx.oncomplete = () => {
            resolve();
        };

        tx.onerror = () => {
            reject(tx.error);
        };

        tx.onabort = () => {
            reject(tx.error);
        };
    }).finally(() => {
        db.close();
    });
}

/* ==========================================
   Image Compression
========================================== */

async function compressCoverImage(file) {
    const allowed = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (!allowed.includes(file.type)) {
        throw new Error(
            "JPG, PNG, WEBP 이미지만 사용할 수 있어요."
        );
    }

    if (file.size > 15 * 1024 * 1024) {
        throw new Error(
            "15MB 이하의 이미지를 선택해 주세요."
        );
    }

    const objectURL = URL.createObjectURL(file);

    try {
        const image = await new Promise((resolve, reject) => {
            const img = new Image();

            img.onload = () => resolve(img);
            img.onerror = () => reject(
                new Error("이미지를 읽을 수 없어요.")
            );

            img.src = objectURL;
        });

        const MAX_WIDTH = 420;
        const MAX_HEIGHT = 630;

        const ratio = Math.min(
            1,
            MAX_WIDTH / image.naturalWidth,
            MAX_HEIGHT / image.naturalHeight
        );

        const width = Math.max(
            1,
            Math.round(image.naturalWidth * ratio)
        );

        const height = Math.max(
            1,
            Math.round(image.naturalHeight * ratio)
        );

        const canvas = document.createElement("canvas");

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");

        if (!ctx) {
            throw new Error(
                "이미지 압축을 지원하지 않는 환경이에요."
            );
        }

        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        ctx.drawImage(
            image,
            0,
            0,
            width,
            height
        );

        return await new Promise((resolve, reject) => {
            canvas.toBlob(
                blob => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error(
                            "이미지 압축에 실패했어요."
                        ));
                    }
                },
                "image/webp",
                0.82
            );
        });

    } finally {
        URL.revokeObjectURL(objectURL);
    }
}

/* ==========================================
   Utilities
========================================== */

function createId() {
    if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
    ) {
        return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function today() {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getRatingStars(rating) {
    const value = Math.max(
        0,
        Math.min(5, Number(rating) || 0)
    );

    return value
        ? "★".repeat(value) + "☆".repeat(5 - value)
        : "";
}

function getProgress(book) {
    const total = Number(book.totalPages) || 0;
    const current = Number(book.currentPage) || 0;

    if (total <= 0) return 0;

    return Math.min(
        100,
        Math.round(current / total * 100)
    );
}

function getBooksByStatus(status) {
    return books.filter(book =>
        book.status === status
    );
}

function getFinishedBooks(year = selectedYear) {
    return books.filter(book =>
        book.status === "finished" &&
        book.finishedDate &&
        Number(book.finishedDate.slice(0, 4)) === Number(year)
    );
}

/* ==========================================
   Cover Rendering
========================================== */

function createCoverPlaceholder(book, className) {
    const placeholder = document.createElement("div");

    placeholder.className =
        `${className} cover-placeholder`;

    placeholder.textContent =
        book.title || "No Cover";

    return placeholder;
}

function getCoverElement(book, className = "book-cover") {
    const placeholder = createCoverPlaceholder(
        book,
        className
    );

    // IndexedDB에 저장된 이미지
    if (book.coverStored) {
        getCoverImage(book.id)
            .then(blob => {
                if (!blob || !placeholder.isConnected) {
                    return;
                }

                const objectURL = URL.createObjectURL(blob);

                const image = document.createElement("img");

                image.className = className;
                image.alt = `${book.title} 표지`;
                image.loading = "lazy";

                image.onload = () => {
                    URL.revokeObjectURL(objectURL);
                };

                image.onerror = () => {
                    URL.revokeObjectURL(objectURL);
                    image.replaceWith(
                        createCoverPlaceholder(book, className)
                    );
                };

                image.src = objectURL;

                if (placeholder.isConnected) {
                    placeholder.replaceWith(image);
                } else {
                    URL.revokeObjectURL(objectURL);
                }
            })
            .catch(error => {
                console.error("Cover loading failed:", error);
            });

        return placeholder;
    }

    // 기존 URL 등록 방식과 호환
    if (book.cover) {
        const image = document.createElement("img");

        image.className = className;
        image.src = book.cover;
        image.alt = `${book.title} 표지`;
        image.loading = "lazy";

        image.onerror = () => {
            image.replaceWith(placeholder);
        };

        return image;
    }

    return placeholder;
}

/* ==========================================
   Cover Upload Preview
========================================== */

function clearCoverPreviewURL() {
    if (coverPreviewURL) {
        URL.revokeObjectURL(coverPreviewURL);
        coverPreviewURL = null;
    }
}

function showCoverPreview(blob) {
    clearCoverPreviewURL();

    coverPreviewURL = URL.createObjectURL(blob);

    $("coverPreview").src = coverPreviewURL;
    $("coverPreviewContainer").hidden = false;
}

function resetCoverUpload() {
    selectedCoverFile = null;
    removeCurrentCover = false;

    $("bookCoverFile").value = "";

    clearCoverPreviewURL();

    $("coverPreview").removeAttribute("src");
    $("coverPreviewContainer").hidden = true;
}

$("selectCoverButton").addEventListener("click", () => {
    $("bookCoverFile").click();
});

$("bookCoverFile").addEventListener("change", event => {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowed = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (!allowed.includes(file.type)) {
        showToast("JPG, PNG, WEBP 이미지만 선택해 주세요.");
        $("bookCoverFile").value = "";
        return;
    }

    if (file.size > 15 * 1024 * 1024) {
        showToast("15MB 이하의 이미지를 선택해 주세요.");
        $("bookCoverFile").value = "";
        return;
    }

    selectedCoverFile = file;
    removeCurrentCover = false;

    showCoverPreview(file);
});

$("removeCoverButton").addEventListener("click", () => {
    selectedCoverFile = null;
    removeCurrentCover = true;

    $("bookCoverFile").value = "";

    clearCoverPreviewURL();

    $("coverPreview").removeAttribute("src");
    $("coverPreviewContainer").hidden = true;
});

/* ==========================================
   Year Selector
========================================== */

function renderYearSelector() {
    const selector = $("yearSelect");

    const years = new Set([
        new Date().getFullYear(),
        selectedYear
    ]);

    books.forEach(book => {
        if (book.finishedDate) {
            years.add(
                Number(book.finishedDate.slice(0, 4))
            );
        }
    });

    Object.keys(goals).forEach(year => {
        years.add(Number(year));
    });

    selector.replaceChildren();

    [...years]
        .filter(Number.isFinite)
        .sort((a, b) => b - a)
        .forEach(year => {
            const option = document.createElement("option");

            option.value = String(year);
            option.textContent = String(year);

            selector.appendChild(option);
        });

    selector.value = String(selectedYear);
}

/* ==========================================
   Reading Goal
========================================== */

function renderGoal() {
    const completed = getFinishedBooks().length;

    const goal = Math.max(
        1,
        Number(goals[selectedYear]) || DEFAULT_GOAL
    );

    const percent = Math.min(
        100,
        Math.round(completed / goal * 100)
    );

    $("completedCount").textContent =
        String(completed).padStart(2, "0");

    $("goalCount").textContent = String(goal);
    $("goalPercent").textContent = `${percent}%`;

    const progress = $("goalProgress");

    progress.replaceChildren();

    const segments = Math.min(goal, 24);
    const filledCount = Math.min(
        segments,
        Math.round(completed / goal * segments)
    );

    for (let i = 0; i < segments; i++) {
        const segment = document.createElement("div");

        segment.className = "goal-segment";

        if (i < filledCount) {
            segment.classList.add("filled");
        }

        progress.appendChild(segment);
    }
}

/* ==========================================
   Bookshelf
========================================== */

function renderBookshelf() {
    const container = $("bookshelf");

    container.replaceChildren();

    books.forEach(book => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "book-card";

        if (book.id === selectedBookId) {
            button.classList.add("selected");
        }

        const cover = getCoverElement(book);

        const title = document.createElement("span");

        title.className = "book-title";
        title.textContent = book.title;

        button.append(cover, title);

        button.onclick = () => {
            selectedBookId = book.id;
            renderBookshelf();
        };

        container.appendChild(button);
    });

    const addButton = document.createElement("button");

    addButton.type = "button";
    addButton.className = "add-book-card";

    const addCover = document.createElement("div");

    addCover.className = "add-book-cover";
    addCover.textContent = "+";

    const addLabel = document.createElement("span");

    addLabel.className = "add-book-label";
    addLabel.textContent = "Add book";

    addButton.append(addCover, addLabel);

    addButton.onclick = () => openBookModal();

    container.appendChild(addButton);

    renderSelectedBook();
}

/* ==========================================
   Selected Book Detail
========================================== */

function renderSelectedBook() {
    const book = books.find(
        item => item.id === selectedBookId
    );

    if (!book) {
        $("bookDetail").hidden = true;
        return;
    }

    $("bookDetail").hidden = false;

    $("detailTitle").textContent = book.title;
    $("detailAuthor").textContent = book.author || "";

    const statusNames = {
        wishlist: "Wishlist",
        reading: "Reading",
        finished: "Finished"
    };

    $("detailStatus").textContent =
        statusNames[book.status] || "";

    $("detailDate").textContent =
        book.status === "finished"
            ? book.finishedDate || ""
            : "";

    $("detailRating").textContent =
        getRatingStars(book.rating);

    $("detailNote").textContent =
        book.note ? `“${book.note}”` : "";

    $("editBookButton").onclick = () => {
        openBookModal(book);
    };

    const deleteButton = $("deleteBookButton");

    deleteButton.textContent =
        pendingDeleteId === book.id ? "삭제 확인" : "×";

    deleteButton.onclick = () => {
        deleteBook(book.id);
    };
}

/* ==========================================
   Currently Reading
========================================== */

function renderReading() {
    const container = $("readingView");

    container.replaceChildren();

    const readingBooks = getBooksByStatus("reading");

    if (readingBooks.length === 0) {
        renderEmptyMessage("현재 읽고 있는 책이 없어요.");
        return;
    }

    readingBooks.forEach(book => {
        const item = document.createElement("div");

        item.className = "reading-item";

        const cover = getCoverElement(
            book,
            "reading-cover"
        );

        const info = document.createElement("div");

        info.className = "reading-info";

        const title = document.createElement("h3");
        title.textContent = book.title;

        const author = document.createElement("p");
        author.textContent = book.author || "";

        const progress = document.createElement("div");
        progress.className = "reading-progress";

        const fill = document.createElement("div");
        fill.className = "reading-progress-fill";

        const percent = getProgress(book);

        fill.style.width = `${percent}%`;
        progress.appendChild(fill);

        const progressText = document.createElement("span");

        progressText.className = "reading-percent";
        progressText.textContent =
            `${book.currentPage || 0} / ${book.totalPages || 0} pages · ${percent}%`;

        const actions = document.createElement("div");

        actions.className = "reading-actions";

        const edit = document.createElement("button");
        edit.type = "button";
        edit.textContent = "Edit";
        edit.onclick = () => openBookModal(book);

        const finish = document.createElement("button");
        finish.type = "button";
        finish.textContent = "Mark as Finished";
        finish.onclick = () => finishBook(book.id);

        actions.append(edit, finish);

        info.append(
            title,
            author,
            progress,
            progressText,
            actions
        );

        item.append(cover, info);
        container.appendChild(item);
    });
}

function finishBook(id) {
    const book = books.find(book => book.id === id);

    if (!book) return;

    const previous = { ...book };

    book.status = "finished";
    book.finishedDate = today();

    if (Number(book.totalPages) > 0) {
        book.currentPage = book.totalPages;
    }

    if (saveBooks()) {
        renderAll();
        showToast("완독을 축하해요! ♡");
    } else {
        Object.assign(book, previous);
    }
}

/* ==========================================
   History
========================================== */

function renderHistory() {
    const container = $("historyView");

    container.replaceChildren();

    const finished = getFinishedBooks()
        .sort((a, b) =>
            b.finishedDate.localeCompare(a.finishedDate)
        );

    if (finished.length === 0) {
        renderEmptyMessage("이 연도의 완독 기록이 없어요.");
        return;
    }

    finished.forEach(book => {
        const item = document.createElement("div");

        item.className = "history-item";

        const info = document.createElement("div");
        info.className = "history-info";

        const title = document.createElement("h3");
        title.textContent = book.title;

        const author = document.createElement("p");
        author.textContent = book.author || "";

        info.append(title, author);

        const meta = document.createElement("div");
        meta.className = "history-meta";

        const rating = document.createElement("span");
        rating.className = "history-rating";
        rating.textContent = getRatingStars(book.rating);

        const date = document.createElement("span");
        date.className = "history-date";
        date.textContent = book.finishedDate || "";

        meta.append(rating, date);
        item.append(info, meta);

        item.style.cursor = "pointer";

        item.onclick = () => {
            selectedBookId = book.id;
            changeView("bookshelf");
        };

        container.appendChild(item);
    });
}

/* ==========================================
   Empty State
========================================== */

function renderEmptyMessage(message) {
    $("emptyState").hidden = false;

    $("emptyState").querySelector("p").textContent =
        message;
}

/* ==========================================
   Navigation
========================================== */

function changeView(view) {
    currentView = view;
    renderAll();
}

function renderNavigation() {
    document.querySelectorAll(".tab").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.view === currentView
        );
    });

    $("bookshelfView").hidden =
        currentView !== "bookshelf";

    $("readingView").hidden =
        currentView !== "reading";

    $("historyView").hidden =
        currentView !== "history";
}

/* ==========================================
   Book Editor
========================================== */

async function openBookModal(book = null) {
    editingBookId = book?.id || null;

    $("bookForm").reset();
    resetCoverUpload();

    $("modalTitle").textContent =
        book ? "Edit Book" : "Add Book";

    if (book) {
        $("bookTitle").value = book.title;
        $("bookAuthor").value = book.author || "";

        $("bookStatus").value = book.status;
        $("bookRating").value = book.rating || 0;

        $("currentPage").value = book.currentPage || 0;
        $("totalPages").value = book.totalPages || 0;

        $("finishDate").value = book.finishedDate || "";
        $("bookNote").value = book.note || "";
    }

    updateFinishDate();

    $("bookModal").hidden = false;
    $("bookTitle").focus();

    if (!book) return;

    if (book.coverStored) {
        try {
            const blob = await getCoverImage(book.id);

            if (
                editingBookId === book.id &&
                !selectedCoverFile &&
                !removeCurrentCover &&
                blob
            ) {
                showCoverPreview(blob);
            }

        } catch (error) {
            console.error("Preview loading failed:", error);
            showToast("기존 표지를 불러올 수 없어요.");
        }

    } else if (book.cover) {
        if (
            editingBookId === book.id &&
            !selectedCoverFile &&
            !removeCurrentCover
        ) {
            $("coverPreview").src = book.cover;
            $("coverPreviewContainer").hidden = false;
        }
    }
}

function closeBookModal() {
    $("bookModal").hidden = true;

    editingBookId = null;
    resetCoverUpload();
}

function updateFinishDate() {
    const finished = $("bookStatus").value === "finished";

    $("finishDateGroup").hidden = !finished;

    if (finished && !$("finishDate").value) {
        $("finishDate").value = today();
    }
}

/* ==========================================
   Save Book
========================================== */

$("bookForm").onsubmit = async event => {
    event.preventDefault();

    const saveButton = $("bookForm").querySelector(
        'button[type="submit"]'
    );

    if (saveButton.disabled) return;

    const title = $("bookTitle").value.trim();

    if (!title) return;

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    try {
        const status = $("bookStatus").value;

        const totalPages = Math.max(
            0,
            Number($("totalPages").value) || 0
        );

        const currentPage = Math.min(
            totalPages || Infinity,
            Math.max(0, Number($("currentPage").value) || 0)
        );

        const existingBook = editingBookId
            ? books.find(book => book.id === editingBookId)
            : null;

        const bookId = existingBook
            ? existingBook.id
            : createId();

        let coverStored = Boolean(existingBook?.coverStored);
        let oldCoverURL = existingBook?.cover || "";

        if (selectedCoverFile) {
            const compressed = await compressCoverImage(
                selectedCoverFile
            );

            await saveCoverImage(bookId, compressed);

            coverStored = true;
            oldCoverURL = "";

        } else if (removeCurrentCover) {
            if (coverStored) {
                await deleteCoverImage(bookId);
            }

            coverStored = false;
            oldCoverURL = "";
        }

        const data = {
            title,
            author: $("bookAuthor").value.trim(),

            cover: oldCoverURL,
            coverStored,

            status,
            rating: Number($("bookRating").value),

            currentPage,
            totalPages,

            finishedDate: status === "finished"
                ? $("finishDate").value || today()
                : null,

            note: $("bookNote").value.trim()
        };

        const previousBooks = books.map(book => ({ ...book }));

        if (existingBook) {
            Object.assign(existingBook, data);

        } else {
            books.push({
                id: bookId,
                ...data,
                createdAt: new Date().toISOString()
            });

            selectedBookId = bookId;
        }

        if (!saveBooks()) {
            books = previousBooks;
            showToast("책 정보 저장에 실패했어요.");
            return;
        }

        closeBookModal();
        renderAll();

        showToast("책이 저장되었어요 ♡");

    } catch (error) {
        console.error("Book save failed:", error);

        showToast(
            error.message || "책 저장에 실패했어요."
        );

    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Save Book";
    }
};

/* ==========================================
   Delete Book
   Two-click confirmation for Notion iframe
========================================== */

async function deleteBook(id) {
    const book = books.find(book => book.id === id);

    if (!book) return;

    // 첫 클릭에는 삭제하지 않고 확인 요청
    if (pendingDeleteId !== id) {
        pendingDeleteId = id;

        clearTimeout(deleteTimer);

        showToast("삭제하려면 × 버튼을 한 번 더 눌러 주세요.");

        deleteTimer = setTimeout(() => {
            pendingDeleteId = null;
            renderSelectedBook();
        }, 5000);

        renderSelectedBook();
        return;
    }

    clearTimeout(deleteTimer);
    pendingDeleteId = null;

    const previousBooks = [...books];

    books = books.filter(item => item.id !== id);

    if (!saveBooks()) {
        books = previousBooks;
        return;
    }

    if (selectedBookId === id) {
        selectedBookId = null;
    }

    renderAll();
    showToast("책이 삭제되었어요.");

    if (book.coverStored) {
        try {
            await deleteCoverImage(id);
        } catch (error) {
            console.error("Cover deletion failed:", error);
            showToast("책은 삭제됐지만 이미지 정리는 실패했어요.");
        }
    }
}

/* ==========================================
   Reading Goal
========================================== */

function openGoalModal() {
    $("goalInput").value =
        goals[selectedYear] || DEFAULT_GOAL;

    $("goalModal").hidden = false;
}

function closeGoalModal() {
    $("goalModal").hidden = true;
}

$("goalForm").onsubmit = event => {
    event.preventDefault();

    const goal = Number($("goalInput").value);

    if (
        !Number.isInteger(goal) ||
        goal < 1 ||
        goal > 999
    ) {
        showToast("독서 목표는 1~999권으로 설정해 주세요.");
        return;
    }

    const previous = goals[selectedYear];

    goals[selectedYear] = goal;

    if (saveGoals()) {
        closeGoalModal();
        renderAll();
        showToast("독서 목표가 저장되었어요.");

    } else {
        if (previous === undefined) {
            delete goals[selectedYear];
        } else {
            goals[selectedYear] = previous;
        }
    }
};

/* ==========================================
   Toast
========================================== */

function showToast(message) {
    const toast = $("toast");

    clearTimeout(toastTimer);

    toast.textContent = message;
    toast.classList.add("show");

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2200);
}

/* ==========================================
   Render All
========================================== */

function renderAll() {
    $("emptyState").hidden = true;

    renderYearSelector();
    renderGoal();
    renderNavigation();

    if (currentView === "bookshelf") {
        renderBookshelf();

    } else if (currentView === "reading") {
        renderReading();

    } else if (currentView === "history") {
        renderHistory();
    }
}

/* ==========================================
   Events
========================================== */

document.querySelectorAll(".tab").forEach(button => {
    button.addEventListener("click", () => {
        changeView(button.dataset.view);
    });
});

$("yearSelect").addEventListener("change", event => {
    selectedYear = Number(event.target.value);
    renderAll();
});

$("goalButton").addEventListener(
    "click",
    openGoalModal
);

$("closeGoalModal").addEventListener(
    "click",
    closeGoalModal
);

$("closeModal").addEventListener(
    "click",
    closeBookModal
);

$("cancelModal").addEventListener(
    "click",
    closeBookModal
);

$("bookStatus").addEventListener(
    "change",
    updateFinishDate
);

$("bookModal").addEventListener("click", event => {
    if (event.target === $("bookModal")) {
        closeBookModal();
    }
});

$("goalModal").addEventListener("click", event => {
    if (event.target === $("goalModal")) {
        closeGoalModal();
    }
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closeBookModal();
        closeGoalModal();
    }
});

window.addEventListener("storage", event => {
    if (event.key === STORAGE_KEY) {
        books = loadBooks();
        renderAll();
    }

    if (event.key === GOAL_KEY) {
        goals = loadGoals();
        renderAll();
    }
});

/* ==========================================
   Initialize
========================================== */

renderAll();
