
/* ==============================
   My Little Feed
   IndexedDB 기반 저장
============================== */

const DB_NAME = "MyLittleFeedDB";
const DB_VERSION = 1;
const STORE_NAME = "files";
const SETTINGS_KEY = "myLittleFeedSettings_v1";

const $ = (id) => document.getElementById(id);

const DEFAULT_SETTINGS = {
  username: "little.moments",
  date: "My little diary",
  caption: "오늘의 작은 순간들을 기록해요 ♡",
  musicTitle: "A song for today",
  musicArtist: "Add your favorite song",
  liked: false,
  bookmarked: false
};

let settings = { ...DEFAULT_SETTINGS };
let photos = [];
let currentPhotoIndex = 0;

let avatarURL = null;
let photoURLs = [];
let audioURL = null;
let audioPlayer = new Audio();

let removePhotosPending = false;
let removeAudioPending = false;

let db = null;
let toastTimer = null;

let musicCoverURL = null;
let removeMusicCoverPending = false;

/* ==============================
   데이터베이스
============================== */

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function dbGet(key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(key);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function dbSet(key, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(value, key);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function dbDelete(key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(key);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/* ==============================
   메시지
============================== */

function showToast(message) {
  const toast = $("toast");

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

/* ==============================
   설정 저장
============================== */

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));

    if (saved && typeof saved === "object") {
      settings = { ...DEFAULT_SETTINGS, ...saved };
    }
  } catch (error) {
    settings = { ...DEFAULT_SETTINGS };
  }
}

function saveSettings() {
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify(settings)
  );
}

/* ==============================
   프로필 렌더링
============================== */

function renderProfile() {
  $("username").textContent = settings.username;
  $("captionUsername").textContent = settings.username;
  $("postDate").textContent = settings.date;

  $("captionText").textContent = settings.caption;
}

function renderAvatar(blob) {
  if (avatarURL) {
    URL.revokeObjectURL(avatarURL);
    avatarURL = null;
  }

  const avatar = $("avatar");
  avatar.replaceChildren();

  if (blob) {
    avatarURL = URL.createObjectURL(blob);

    const img = document.createElement("img");
    img.src = avatarURL;
    img.alt = "프로필 사진";

    avatar.appendChild(img);
  } else {
    const span = document.createElement("span");
    span.textContent = "♡";
    avatar.appendChild(span);
  }
}

/* ==============================
   사진 렌더링
============================== */

function setPhotoURLs(files) {
  photoURLs.forEach((url) => URL.revokeObjectURL(url));

  photos = files;
  photoURLs = files.map((file) => URL.createObjectURL(file));

  currentPhotoIndex = 0;
  renderPhoto();
}

function renderPhoto() {
  const hasPhotos = photoURLs.length > 0;

  $("photoEmpty").hidden = hasPhotos;
  $("postImage").hidden = !hasPhotos;

  $("prevBtn").hidden = photoURLs.length <= 1;
  $("nextBtn").hidden = photoURLs.length <= 1;

  if (!hasPhotos) {
    $("postImage").removeAttribute("src");
    $("photoCount").textContent = "";
    $("photoDots").replaceChildren();
    return;
  }

  $("postImage").src = photoURLs[currentPhotoIndex];

  $("photoCount").textContent =
    photoURLs.length > 1
      ? `${currentPhotoIndex + 1} / ${photoURLs.length}`
      : "";

  const dots = $("photoDots");
  dots.replaceChildren();

  if (photoURLs.length <= 1) return;

  photoURLs.forEach((_, index) => {
    const dot = document.createElement("span");
    dot.className = "photo-dot";

    if (index === currentPhotoIndex) {
      dot.classList.add("active");
    }

    dots.appendChild(dot);
  });
}

function nextPhoto() {
  if (photoURLs.length <= 1) return;

  currentPhotoIndex =
    (currentPhotoIndex + 1) % photoURLs.length;

  renderPhoto();
}

function previousPhoto() {
  if (photoURLs.length <= 1) return;

  currentPhotoIndex =
    (currentPhotoIndex - 1 + photoURLs.length)
    % photoURLs.length;

  renderPhoto();
}

/* ==============================
   음악 플레이어
============================== */

function renderMusicInfo() {
  $("musicTitle").textContent = settings.musicTitle;
  $("musicArtist").textContent = settings.musicArtist;
}

function updatePlayIcon() {
  const isPlaying = !audioPlayer.paused;

  $("playIcon").innerHTML = isPlaying
    ? '<path d="M7 5h4v14H7z M14 5h4v14h-4z"/>'
    : '<path d="M8 5 L19 12 L8 19 Z"/>';
}

function setAudio(blob) {
  audioPlayer.pause();

  if (audioURL) {
    URL.revokeObjectURL(audioURL);
    audioURL = null;
  }

  audioPlayer.removeAttribute("src");
  audioPlayer.load();

  if (blob) {
    audioURL = URL.createObjectURL(blob);
    audioPlayer.src = audioURL;
  }

  $("playBtn").disabled = !blob;
  updatePlayIcon();
}

async function toggleMusic() {
  if (!audioURL) {
    showToast("편집에서 음악 파일을 추가해 주세요 ♫");
    return;
  }

  try {
    if (audioPlayer.paused) {
      await audioPlayer.play();
    } else {
      audioPlayer.pause();
    }
  } catch (error) {
    showToast("음악을 재생할 수 없어요.");
  }

  updatePlayIcon();
}

/* ==============================
   좋아요 / 북마크
============================== */

function renderActions() {
  $("likeBtn").classList.toggle("liked", settings.liked);
  $("bookmarkBtn").classList.toggle(
    "saved",
    settings.bookmarked
  );
}

function toggleLike() {
  settings.liked = !settings.liked;
  saveSettings();
  renderActions();
}

function toggleBookmark() {
  settings.bookmarked = !settings.bookmarked;
  saveSettings();
  renderActions();
}


/* ==============================
   앨범 커버 표시
============================== */

function renderMusicCover(blob) {
  const image = $("musicCoverImage");
  const placeholder = $("musicPlaceholder");

  if (musicCoverURL) {
    URL.revokeObjectURL(musicCoverURL);
    musicCoverURL = null;
  }

  if (blob) {
    musicCoverURL = URL.createObjectURL(blob);

    image.src = musicCoverURL;
    image.hidden = false;
    placeholder.hidden = true;
  } else {
    image.removeAttribute("src");
    image.hidden = true;
    placeholder.hidden = false;
  }
}


/* ==============================
   편집 모달
============================== */

function openEditModal() {
  $("usernameInput").value = settings.username;
  $("dateInput").value = settings.date;
  $("captionInput").value = settings.caption;

  $("musicTitleInput").value = settings.musicTitle;
  $("musicArtistInput").value = settings.musicArtist;

  $("avatarInput").value = "";
  $("photosInput").value = "";
  $("audioInput").value = "";

  // 앨범 커버 편집 초기화
  $("musicCoverInput").value = "";

  removeMusicCoverPending = false;

  $("removeMusicCoverBtn").textContent =
    "Remove album cover";

  removePhotosPending = false;
  removeAudioPending = false;

  $("removePhotosBtn").textContent = "Remove all photos";
  $("removeAudioBtn").textContent = "Remove music file";

  $("audioStatus").textContent = audioURL
    ? "현재 음악 파일이 등록되어 있어요."
    : "MP3 등의 음악 파일을 추가할 수 있어요.";

  $("editModal").hidden = false;
}

function closeEditModal() {
  $("editModal").hidden = true;
}

/* ==============================
   이미지 크기 최적화
============================== */

function optimizeImage(file, maxSize = 1600) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("이미지 파일이 아닙니다."));
      return;
    }

    const img = new Image();
    const sourceURL = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(sourceURL);

      const scale = Math.min(
        1,
        maxSize / Math.max(img.width, img.height)
      );

      const canvas = document.createElement("canvas");

      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("이미지를 처리할 수 없습니다."));
        return;
      }

      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("이미지 변환 실패"));
        },
        "image/jpeg",
        0.85
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(sourceURL);
      reject(new Error("이미지를 불러올 수 없습니다."));
    };

    img.src = sourceURL;
  });
}

/* ==============================
   변경사항 저장
============================== */

async function saveChanges() {
  const saveBtn = $("saveBtn");
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  try {
    const avatarFile = $("avatarInput").files[0];
    const photoFiles = Array.from($("photosInput").files);
    const audioFile = $("audioInput").files[0];
    const musicCoverFile = $("musicCoverInput").files[0];

    // 파일 먼저 처리
    let newAvatar = null;
    let newPhotos = null;

    if (avatarFile) {
      newAvatar = await optimizeImage(avatarFile, 500);
    }

    if (photoFiles.length > 0) {
      if (photoFiles.length > 10) {
        throw new Error("사진은 최대 10장까지 추가할 수 있어요.");
      }

      newPhotos = await Promise.all(
        photoFiles.map((file) => optimizeImage(file))
      );
    }

    // 이미지 및 음악 저장
    if (newAvatar) {
      await dbSet("avatar", newAvatar);
      renderAvatar(newAvatar);
    }

    if (newPhotos) {
      await dbSet("photos", newPhotos);
      setPhotoURLs(newPhotos);
    } else if (removePhotosPending) {
      await dbDelete("photos");
      setPhotoURLs([]);
    }

    if (audioFile) {
      if (!audioFile.type.startsWith("audio/") &&
          !/\.(mp3|m4a|wav|ogg|aac)$/i.test(audioFile.name)) {
        throw new Error("지원되는 음악 파일을 선택해 주세요.");
      }

      await dbSet("audio", audioFile);
      setAudio(audioFile);
    } else if (removeAudioPending) {
      await dbDelete("audio");
      setAudio(null);
    }

    // 앨범 커버 저장 및 변경
    if (musicCoverFile) {
      const optimizedCover = await optimizeImage(
        musicCoverFile,
        500
      );

      await dbSet("musicCover", optimizedCover);
      renderMusicCover(optimizedCover);

    } else if (removeMusicCoverPending) {
      await dbDelete("musicCover");
      renderMusicCover(null);
    }

    // 텍스트 저장
    settings.username =
      $("usernameInput").value.trim() || "little.moments";

    settings.date =
      $("dateInput").value.trim() || "My little diary";

    settings.caption =
      $("captionInput").value.trim();

    settings.musicTitle =
      $("musicTitleInput").value.trim() || "A song for today";

    settings.musicArtist =
      $("musicArtistInput").value.trim() || "Unknown artist";

    saveSettings();

    renderProfile();
    renderMusicInfo();

    closeEditModal();
    showToast("Your little moment is saved ♡");

  } catch (error) {
    console.error(error);
    showToast(error.message || "저장에 실패했어요.");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save changes ♡";
  }
}

/* ==============================
   초기 데이터 불러오기
============================== */

async function initialize() {
  loadSettings();

  renderProfile();
  renderMusicInfo();
  renderActions();
  renderPhoto();

  audioPlayer.addEventListener("play", updatePlayIcon);
  audioPlayer.addEventListener("pause", updatePlayIcon);
  audioPlayer.addEventListener("ended", updatePlayIcon);

  try {
    db = await openDatabase();

    const [savedAvatar, savedPhotos, savedAudio] =
      await Promise.all([
        dbGet("avatar"),
        dbGet("photos"),
        dbGet("audio")
      ]);

    renderAvatar(savedAvatar || null);

    if (Array.isArray(savedPhotos)) {
      setPhotoURLs(savedPhotos);
    }

    setAudio(savedAudio || null);
    
    const savedMusicCover = await dbGet("musicCover");

    renderMusicCover(savedMusicCover || null); 

  } catch (error) {
    console.error("초기화 실패:", error);
    showToast("저장소를 사용할 수 없어요.");
    $("editBtn").disabled = true;
    $("addPhotoBtn").disabled = true;
  }
}

/* ==============================
   이벤트 연결
============================== */

$("editBtn").addEventListener("click", openEditModal);

$("addPhotoBtn").addEventListener("click", () => {
  openEditModal();
  $("photosInput").click();
});

$("closeModalBtn").addEventListener("click", closeEditModal);

$("editModal").addEventListener("click", (event) => {
  if (event.target === $("editModal")) {
    closeEditModal();
  }
});

$("saveBtn").addEventListener("click", saveChanges);

$("nextBtn").addEventListener("click", nextPhoto);
$("prevBtn").addEventListener("click", previousPhoto);

$("playBtn").addEventListener("click", toggleMusic);

$("likeBtn").addEventListener("click", toggleLike);
$("bookmarkBtn").addEventListener("click", toggleBookmark);

$("removePhotosBtn").addEventListener("click", () => {
  removePhotosPending = !removePhotosPending;

  if (removePhotosPending) {
    $("photosInput").value = "";
  }

  $("removePhotosBtn").textContent = removePhotosPending
    ? "✓ Photos will be removed"
    : "Remove all photos";
});

$("photosInput").addEventListener("change", () => {
  if ($("photosInput").files.length > 0) {
    removePhotosPending = false;
    $("removePhotosBtn").textContent = "Remove all photos";
  }
});

$("removeAudioBtn").addEventListener("click", () => {
  removeAudioPending = !removeAudioPending;

  if (removeAudioPending) {
    $("audioInput").value = "";
  }

  $("removeAudioBtn").textContent = removeAudioPending
    ? "✓ Music will be removed"
    : "Remove music file";
});

$("audioInput").addEventListener("change", () => {
  if ($("audioInput").files.length > 0) {
    removeAudioPending = false;
    $("removeAudioBtn").textContent = "Remove music file";
  }
});

/* ==============================
   앨범 커버 삭제
============================== */

$("removeMusicCoverBtn").addEventListener("click", () => {
  removeMusicCoverPending = !removeMusicCoverPending;

  if (removeMusicCoverPending) {
    $("musicCoverInput").value = "";
  }

  $("removeMusicCoverBtn").textContent =
    removeMusicCoverPending
      ? "✓ Album cover will be removed"
      : "Remove album cover";
});

// 새로운 이미지를 선택하면 삭제 예약 취소
$("musicCoverInput").addEventListener("change", () => {
  if ($("musicCoverInput").files.length > 0) {
    removeMusicCoverPending = false;

    $("removeMusicCoverBtn").textContent =
      "Remove album cover";
  }
});

// 댓글 버튼: 댓글 입력 영역 표시

/* ==============================
   댓글 관리
============================== */

const COMMENTS_KEY = "myLittleFeedComments";

// 댓글 불러오기
function getComments() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(COMMENTS_KEY) || "[]"
    );

    if (!Array.isArray(saved)) return [];

    // 이전 버전 댓글(문자열)도 지원
    return saved.map((item, index) => {
      if (typeof item === "string") {
        return {
          id: `old-${index}`,
          text: item
        };
      }

      return item;
    }).filter((item) =>
      item &&
      typeof item.text === "string" &&
      item.id !== undefined
    );

  } catch (error) {
    return [];
  }
}

// 댓글 저장
function saveComments(comments) {
  localStorage.setItem(
    COMMENTS_KEY,
    JSON.stringify(comments)
  );
}

// 댓글 작성창
$("commentBtn").addEventListener("click", () => {
  const existing = $("commentEditor");

  if (existing) {
    existing.remove();
    return;
  }

  const editor = document.createElement("div");
  editor.id = "commentEditor";
  editor.className = "comment-editor";

  const input = document.createElement("textarea");
  input.placeholder = "댓글을 남겨보세요...";
  input.rows = 2;

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Post";

  editor.append(input, saveBtn);

  document.querySelector(".caption-area").after(editor);

  saveBtn.addEventListener("click", () => {
    const text = input.value.trim();

    if (!text) return;

    const comments = getComments();

    comments.push({
      id: crypto.randomUUID(),
      text
    });

    saveComments(comments);

    editor.remove();
    renderComments();

    showToast("댓글이 저장되었어요 ♡");
  });
});

/* ==============================
   댓글 목록 렌더링
============================== */

function renderComments() {
  let container = $("commentsList");

  if (!container) {
    container = document.createElement("div");
    container.id = "commentsList";
    container.className = "comments-list";

    document.querySelector(".caption-area").after(container);
  }

  container.replaceChildren();

  const comments = getComments();

  comments.forEach((comment) => {
    const item = document.createElement("div");
    item.className = "comment-item";

    // 댓글 내용
    const text = document.createElement("p");
    text.className = "comment-text";
    text.textContent = comment.text;

    // 더보기 버튼
    const moreBtn = document.createElement("button");
    moreBtn.className = "comment-more";
    moreBtn.textContent = "···";
    moreBtn.title = "댓글 관리";

    // 메뉴
    const menu = document.createElement("div");
    menu.className = "comment-menu";
    menu.hidden = true;

    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.className = "delete-comment";

    menu.append(editBtn, deleteBtn);

    moreBtn.addEventListener("click", () => {
      menu.hidden = !menu.hidden;
    });

    // 댓글 수정
    editBtn.addEventListener("click", () => {
      menu.hidden = true;
      showEditComment(item, comment);
    });

    // 댓글 삭제
    deleteBtn.addEventListener("click", () => {
      deleteComment(comment.id);
    });

    item.append(text, moreBtn, menu);
    container.appendChild(item);
  });
}

/* ==============================
   댓글 수정
============================== */

function showEditComment(item, comment) {
  item.replaceChildren();
  item.classList.add("editing");

  const textarea = document.createElement("textarea");
  textarea.value = comment.text;
  textarea.rows = 2;

  const buttons = document.createElement("div");
  buttons.className = "comment-edit-actions";

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save";
  saveBtn.className = "comment-save";

  buttons.append(cancelBtn, saveBtn);
  item.append(textarea, buttons);

  textarea.focus();

  // 수정 취소
  cancelBtn.addEventListener("click", () => {
    renderComments();
  });

  // 수정 저장
  saveBtn.addEventListener("click", () => {
    const newText = textarea.value.trim();

    if (!newText) {
      showToast("댓글 내용을 입력해 주세요.");
      return;
    }

    const comments = getComments();

    const target = comments.find(
      (item) => item.id === comment.id
    );

    if (!target) return;

    target.text = newText;

    saveComments(comments);
    renderComments();

    showToast("댓글이 수정되었어요 ♡");
  });
}

/* ==============================
   댓글 삭제
============================== */

function deleteComment(id) {
  const comments = getComments();

  const updated = comments.filter(
    (comment) => comment.id !== id
  );

  saveComments(updated);
  renderComments();

  showToast("댓글이 삭제되었어요.");
}

/* ==============================
   초기 댓글 표시
============================== */

renderComments();

// 공유 버튼
$("shareBtn").addEventListener("click", async () => {
  try {
    const url = window.location.href;

    if (navigator.share) {
      await navigator.share({
        title: "My Little Feed",
        url
      });
    } else {
      await navigator.clipboard.writeText(url);
      showToast("위젯 링크가 복사되었어요 ♡");
    }
  } catch (error) {
    if (error.name !== "AbortError") {
      showToast("공유할 수 없어요.");
    }
  }
});

renderComments();


/* ==============================
   실행
============================== */

initialize();
