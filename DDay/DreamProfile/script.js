
'use strict';

/* ---------------- Default Data ---------------- */

const STORAGE_KEY = 'dream-profile-v1';

const defaults = {
    eyebrow: "THE PERSON I'M BECOMING",
    title: 'My Future Self.',
    subtitle: 'Growing at my own pace, every day.',
    name: 'A Dreamer',
    bio: 'Dreaming, learning, and becoming.',
    dream: 'IT Professional',
    chapter: 'Learning & Growing',
    focus: 'Study · Career · Routine',
    quote: 'Small steps lead to beautiful places.',
    photo: ''
};

/* ---------------- Elements ---------------- */

const displayIds = {
    eyebrow: 'displayEyebrow',
    title: 'displayTitle',
    subtitle: 'displaySubtitle',
    name: 'displayName',
    bio: 'displayBio',
    dream: 'displayDream',
    chapter: 'displayChapter',
    focus: 'displayFocus',
    quote: 'displayQuote'
};

const modal = document.getElementById('modalBackdrop');
const form = document.getElementById('profileForm');
const status = document.getElementById('formStatus');
const photoInput = document.getElementById('photoInput');
const removePhoto = document.getElementById('removePhoto');

let profile = loadProfile();
let previouslyFocused = null;

/* ---------------- Load Profile ---------------- */

function loadProfile() {
    try {
        const saved = JSON.parse(
            localStorage.getItem(STORAGE_KEY)
        );

        if (
            saved &&
            typeof saved === 'object' &&
            !Array.isArray(saved)
        ) {
            const safe = {};

            for (const key of Object.keys(defaults)) {
                safe[key] =
                    typeof saved[key] === 'string'
                        ? saved[key]
                        : defaults[key];
            }

            return safe;
        }

    } catch (error) {
        console.warn(
            '저장된 프로필을 읽지 못했습니다.',
            error
        );
    }

    return { ...defaults };
}

/* ---------------- Render Profile ---------------- */

function render() {

    Object.entries(displayIds).forEach(([key, id]) => {
        document.getElementById(id).textContent = profile[key];
    });

    const image = document.getElementById('avatarImage');
    const fallback = document.getElementById('avatarFallback');

    if (
        profile.photo &&
        /^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(profile.photo)
    ) {
        image.src = profile.photo;
        image.hidden = false;
        fallback.hidden = true;

    } else {
        image.hidden = true;
        image.removeAttribute('src');
        fallback.hidden = false;
    }
}

/* ---------------- Open Editor ---------------- */

function openEditor() {

    previouslyFocused = document.activeElement;

    Object.keys(displayIds).forEach(key => {
        form.elements.namedItem(key).value = profile[key];
    });

    photoInput.value = '';
    removePhoto.checked = false;
    status.textContent = '';

    modal.hidden = false;
    document.body.style.overflow = 'hidden';

    document.getElementById('closeButton').focus();
}

/* ---------------- Close Editor ---------------- */

function closeEditor() {

    modal.hidden = true;
    document.body.style.overflow = '';

    if (
        previouslyFocused &&
        typeof previouslyFocused.focus === 'function'
    ) {
        previouslyFocused.focus();
    }
}

/* ---------------- Read Image ---------------- */

function readImage(file) {

    return new Promise((resolve, reject) => {

        const reader = new FileReader();

        reader.onload = () => resolve(reader.result);

        reader.onerror = () => {
            reject(new Error('이미지를 읽을 수 없어요.'));
        };

        reader.readAsDataURL(file);
    });
}

/* ---------------- Save Profile ---------------- */

form.addEventListener('submit', async event => {

    event.preventDefault();
    status.textContent = '';

    const next = { ...profile };

    Object.keys(displayIds).forEach(key => {
        next[key] = form.elements.namedItem(key).value.trim();
    });

    // 프로필 이미지 삭제
    if (removePhoto.checked) {
        next.photo = '';

    // 새로운 프로필 이미지 업로드
    } else if (photoInput.files[0]) {

        const file = photoInput.files[0];

        const allowedTypes = [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif'
        ];

        if (!allowedTypes.includes(file.type)) {
            status.textContent =
                'JPG, PNG, WEBP, GIF 이미지만 사용할 수 있어요.';
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            status.textContent =
                '사진은 2MB 이하로 줄여서 다시 선택해 주세요.';
            return;
        }

        try {
            next.photo = await readImage(file);

        } catch (error) {
            status.textContent = error.message;
            return;
        }
    }

    // localStorage 저장
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(next)
        );

    } catch (error) {
        status.textContent =
            '저장 공간이 부족하거나 브라우저 저장이 제한되어 있어요. ' +
            '사진 크기를 줄이거나 브라우저 설정을 확인해 주세요.';
        return;
    }

    profile = next;

    render();
    closeEditor();
});

/* ---------------- Button Events ---------------- */

document
    .getElementById('editButton')
    .addEventListener('click', openEditor);

document
    .getElementById('closeButton')
    .addEventListener('click', closeEditor);

document
    .getElementById('cancelButton')
    .addEventListener('click', closeEditor);

/* ---------------- Backdrop Click ---------------- */

modal.addEventListener('click', event => {

    if (event.target === modal) {
        closeEditor();
    }
});

/* ---------------- Keyboard Events ---------------- */

document.addEventListener('keydown', event => {

    if (modal.hidden) return;

    if (event.key === 'Escape') {
        closeEditor();
    }

    if (event.key === 'Tab') {

        const controls = Array.from(
            modal.querySelectorAll('button,input,textarea')
        ).filter(el => {
            return !el.disabled && el.getClientRects().length;
        });

        if (!controls.length) return;

        const first = controls[0];
        const last = controls[controls.length - 1];

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
});

/* ---------------- Initialize ---------------- */

render();
