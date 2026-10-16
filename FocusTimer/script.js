
'use strict';

/* ================================
   Constants & Default State
================================ */

const KEY = 'notion-focus-v1';

const DEFAULT = {
    durations: {
        focus: 25,
        short: 5,
        long: 15
    },
    sound: true,
    mode: 'focus',
    sessions: [],
    activeId: null
};

const names = {
    focus: 'Focus',
    short: 'Short Break',
    long: 'Long Break'
};

const $ = id => document.getElementById(id);

const clone = x => JSON.parse(JSON.stringify(x));

const validTime = x =>
    Number.isFinite(x) && x >= 0;


/* ================================
   Local Storage
================================ */

function load() {
    try {
        const raw = JSON.parse(localStorage.getItem(KEY));

        if (!raw || typeof raw !== 'object') {
            return clone(DEFAULT);
        }

        const s = {
            ...clone(DEFAULT),
            ...raw
        };

        s.durations = {
            ...DEFAULT.durations,
            ...(raw.durations || {})
        };

        for (const k of Object.keys(names)) {
            if (
                !Number.isInteger(s.durations[k]) ||
                s.durations[k] < 1 ||
                s.durations[k] > 180
            ) {
                s.durations[k] = DEFAULT.durations[k];
            }
        }

        if (!names[s.mode]) {
            s.mode = 'focus';
        }

        if (!Array.isArray(s.sessions)) {
            s.sessions = [];
        }

        s.sessions = s.sessions
            .filter(x =>
                x &&
                typeof x.id === 'string' &&
                names[x.mode] &&
                validTime(x.start) &&
                validTime(x.elapsed) &&
                Array.isArray(x.intervals)
            )
            .map(x => ({
                ...x,
                intervals: x.intervals.filter(i =>
                    validTime(i.start) &&
                    (
                        i.end === null ||
                        (
                            validTime(i.end) &&
                            i.end >= i.start
                        )
                    )
                ),
                status: [
                    'running',
                    'paused',
                    'completed',
                    'stopped'
                ].includes(x.status)
                    ? x.status
                    : 'stopped'
            }));

        if (typeof s.activeId !== 'string') {
            s.activeId = null;
        }

        return s;

    } catch {
        return clone(DEFAULT);
    }
}

let state = load();

let viewDay = dayKey(Date.now());

let lastPaint = 0;

function save() {
    try {
        localStorage.setItem(
            KEY,
            JSON.stringify(state)
        );

        return true;

    } catch {
        $('status').textContent =
            'Storage unavailable. Changes may not survive reload.';

        return false;
    }
}


/* ================================
   Date & Time Utilities
================================ */

function dayKey(ms) {
    const d = new Date(ms);

    return [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, '0'),
        String(d.getDate()).padStart(2, '0')
    ].join('-');
}

function dayStart(key) {
    const [y, m, d] = key.split('-').map(Number);

    return new Date(y, m - 1, d).getTime();
}

function shiftDay(key, n) {
    const d = new Date(dayStart(key));

    d.setDate(d.getDate() + n);

    return dayKey(d.getTime());
}

function clock(ms) {
    if (ms == null) {
        return '—';
    }

    return new Date(ms).toLocaleTimeString(
        'en-GB',
        {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }
    );
}

function duration(ms) {
    const sec = Math.floor(
        Math.max(0, ms) / 1000
    );

    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;

    if (h) {
        return `${h}h ${m}m`;
    }

    if (m) {
        return `${m}m ${s}s`;
    }

    return `${s}s`;
}


/* ================================
   Active Session
================================ */

function active() {
    return state.sessions.find(
        s => s.id === state.activeId
    ) || null;
}

function currentElapsed(s, now = Date.now()) {
    let ms = s.elapsed;

    if (s.status === 'running') {
        ms += Math.max(0, now - s.anchor);
    }

    return Math.min(
        s.target,
        Math.max(0, ms)
    );
}

function closeInterval(s, end) {
    const i = s.intervals[s.intervals.length - 1];

    if (i && i.end === null) {
        i.end = Math.max(i.start, end);
    }
}


/* ================================
   Complete / Stop Session
================================ */

function finish(s, status, at) {
    closeInterval(s, at);

    s.elapsed = Math.min(
        s.target,
        s.intervals.reduce(
            (sum, i) =>
                sum + Math.max(
                    0,
                    (i.end ?? at) - i.start
                ),
            0
        )
    );

    s.anchor = null;
    s.end = at;
    s.status = status;

    state.activeId = null;

    save();
}


/* ================================
   Restore & Reconcile Timer
================================ */

function reconcile() {
    const s = active();

    if (!s) {
        return;
    }

    const now = Date.now();

    if (
        s.status !== 'running' &&
        s.status !== 'paused'
    ) {
        state.activeId = null;
        save();
        return;
    }

    if (s.status === 'running') {
        const remaining = Math.max(
            0,
            s.target - s.elapsed
        );

        // Recover the scheduled completion time
        // even when the browser tab was inactive.
        if (now >= s.anchor + remaining) {
            finish(
                s,
                'completed',
                s.anchor + remaining
            );

            beep();
            return;
        }

        // Handle backward system clock changes.
        if (now < s.anchor) {
            closeInterval(s, s.anchor);

            s.elapsed = Math.min(
                s.target,
                s.intervals.reduce(
                    (a, i) =>
                        a + Math.max(
                            0,
                            (i.end ?? now) - i.start
                        ),
                    0
                )
            );

            s.status = 'paused';
            s.anchor = null;

            save();
        }
    }
}


/* ================================
   Completion Sound
================================ */

function beep() {
    if (!state.sound) {
        return;
    }

    try {
        const C =
            window.AudioContext ||
            window.webkitAudioContext;

        if (!C) {
            return;
        }

        const ctx = new C();

        if (ctx.state === 'suspended') {
            ctx.close();
            return;
        }

        const o = ctx.createOscillator();
        const g = ctx.createGain();

        o.type = 'sine';
        o.frequency.value = 660;

        g.gain.setValueAtTime(
            0.0001,
            ctx.currentTime
        );

        g.gain.exponentialRampToValueAtTime(
            0.13,
            ctx.currentTime + 0.02
        );

        g.gain.exponentialRampToValueAtTime(
            0.0001,
            ctx.currentTime + 0.28
        );

        o.connect(g).connect(ctx.destination);

        o.start();
        o.stop(ctx.currentTime + 0.3);

        o.onended = () => ctx.close();

    } catch {
        // Audio may be blocked by the browser.
    }
}


/* ================================
   Start / Pause / Resume
================================ */

function startPause() {
    reconcile();

    let s = active();
    const now = Date.now();

    if (!s) {

        // Create a new session.
        const target =
            state.durations[state.mode] * 60000;

        s = {
            id: crypto.randomUUID?.() ||
                `${now}-${Math.random()}`,

            mode: state.mode,

            start: now,
            end: null,

            elapsed: 0,
            anchor: now,

            target: target,
            status: 'running',

            intervals: [
                {
                    start: now,
                    end: null
                }
            ]
        };

        state.sessions.push(s);
        state.activeId = s.id;

    } else if (s.status === 'running') {

        // Pause the existing session.
        s.elapsed = currentElapsed(s, now);

        closeInterval(s, now);

        s.anchor = null;
        s.status = 'paused';

    } else if (s.status === 'paused') {

        // Resume without creating another session.
        s.anchor = now;

        s.intervals.push({
            start: now,
            end: null
        });

        s.status = 'running';
    }

    save();
    render();
}


/* ================================
   Reset Timer
================================ */

function stop() {
    reconcile();

    const s = active();

    if (s) {
        finish(
            s,
            'stopped',
            Date.now()
        );
    }

    render();
}


/* ================================
   Switch Timer Mode
================================ */

function switchMode(mode) {
    if (!names[mode] || mode === state.mode) {
        return;
    }

    const s = active();

    if (
        s &&
        !confirm(
            'Stop the current session and switch modes?'
        )
    ) {
        return;
    }

    if (s) {
        finish(
            s,
            'stopped',
            Date.now()
        );
    }

    state.mode = mode;

    save();
    render();
}


/* ================================
   Edit Duration
================================ */

function editDuration() {
    reconcile();

    const s = active();

    if (s?.status === 'running') {
        $('status').textContent =
            'Pause the timer before editing its duration.';

        return;
    }

    $('minutes').value =
        state.durations[state.mode];

    $('editor').classList.remove('hidden');

    $('minutes').focus();
}

function applyDuration() {
    const n = Number($('minutes').value);

    if (
        !Number.isInteger(n) ||
        n < 1 ||
        n > 180
    ) {
        $('status').textContent =
            'Enter a whole number from 1 to 180.';

        return;
    }

    const s = active();

    if (
        s &&
        !confirm(
            'Stop the current session and apply the new duration?'
        )
    ) {
        return;
    }

    if (s) {
        finish(
            s,
            'stopped',
            Date.now()
        );
    }

    state.durations[state.mode] = n;

    $('editor').classList.add('hidden');

    $('status').textContent =
        'Duration updated.';

    save();
    render();
}


/* ================================
   Calculate Daily Running Time
================================ */

// Split actual running intervals by local day.
// Paused periods are not included.

function overlap(s, from, to, now) {
    return s.intervals.reduce(
        (sum, i) => {

            const end = i.end === null
                ? Math.min(
                    now,
                    i.start + Math.max(
                        0,
                        s.target - s.elapsed
                    )
                )
                : i.end;

            return sum + Math.max(
                0,
                Math.min(end, to) -
                Math.max(i.start, from)
            );
        },
        0
    );
}


/* ================================
   Render Daily Focus Log
================================ */

function renderLog(now) {
    const from = dayStart(viewDay);
    const to = dayStart(
        shiftDay(viewDay, 1)
    );

    const items = state.sessions
        .filter(s =>
            s.start < to &&
            (s.end ?? now) >= from
        )
        .sort((a, b) => b.start - a.start);

    let focus = 0;
    let brk = 0;
    let completed = 0;

    // Calculate statistics.
    for (const s of items) {
        const ms = overlap(
            s,
            from,
            to,
            now
        );

        if (s.mode === 'focus') {
            focus += ms;
        } else {
            brk += ms;
        }

        if (
            s.mode === 'focus' &&
            s.status === 'completed' &&
            s.end >= from &&
            s.end < to
        ) {
            completed++;
        }
    }

    $('focus-total').textContent =
        duration(focus);

    $('break-total').textContent =
        duration(brk);

    $('completed-total').textContent =
        completed;

    $('date-label').textContent =
        new Date(from).toLocaleDateString(
            'en-US',
            {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            }
        );

    $('today').disabled =
        viewDay === dayKey(now);

    $('logs').replaceChildren();

    // Empty state.
    if (!items.length) {
        const e = document.createElement('div');

        e.className = 'empty';
        e.textContent =
            'No sessions for this day yet.';

        $('logs').append(e);

        return;
    }

    // Render each session.
    for (const s of items) {

        const row = document.createElement('div');
        row.className = 'log';

        const main = document.createElement('div');
        main.className = 'log-main';

        const top = document.createElement('div');
        top.className = 'log-top';

        const name = document.createElement('strong');
        name.textContent = names[s.mode];

        const pill = document.createElement('span');
        pill.className = 'pill';

        pill.textContent = {
            running: 'In progress',
            paused: 'Paused',
            completed: 'Completed',
            stopped: 'Stopped'
        }[s.status];

        top.append(name, pill);

        // Actual start and end time.
        const meta = document.createElement('div');
        meta.className = 'log-meta';

        const startText =
            (dayKey(s.start) === viewDay
                ? ''
                : dayKey(s.start) + ' ') +
            clock(s.start);

        const endText =
            s.end === null
                ? '—'
                : (
                    dayKey(s.end) === viewDay
                        ? ''
                        : dayKey(s.end) + ' '
                ) + clock(s.end);

        meta.textContent =
            `${startText} → ${endText}`;

        main.append(top, meta);

        // Actual duration for selected day.
        const d = document.createElement('span');
        d.className = 'duration';

        d.textContent = duration(
            overlap(s, from, to, now)
        );

        // Delete session.
        const del = document.createElement('button');

        del.className = 'delete';
        del.textContent = '×';
        del.title = 'Delete session';

        del.setAttribute(
            'aria-label',
            'Delete session'
        );


        del.addEventListener('click', () => {
            // 실행 중인 세션을 삭제하는 경우
            if (state.activeId === s.id) {
                state.activeId = null;
            }

            // 해당 세션 기록 삭제
            state.sessions = state.sessions.filter(
                x => x.id !== s.id
            );

            // 변경 사항 저장 및 화면 갱신
            save();
            render();
        });


        row.append(main, d, del);

        $('logs').append(row);
    }
}


/* ================================
   Render Timer
================================ */

function render() {
    reconcile();

    const now = Date.now();
    const s = active();

    const target = s?.target ??
        state.durations[state.mode] * 60000;

    const remaining = Math.max(
        0,
        target - (
            s ? currentElapsed(s, now) : 0
        )
    );

    const secs = Math.ceil(
        remaining / 1000
    );

    const mm = String(
        Math.floor(secs / 60)
    ).padStart(2, '0');

    const ss = String(
        secs % 60
    ).padStart(2, '0');

    $('time').textContent =
        `${mm}:${ss}`;

    // Circular progress.
    $('progress').style.strokeDashoffset =
        String(
            590.619 *
            (1 - remaining / target)
        );

    $('mode-label').textContent =
        names[state.mode].toUpperCase() +
        ' SESSION';

    // Active mode tab.
    document.querySelectorAll(
        '[data-mode]'
    ).forEach(b => {
        b.classList.toggle(
            'active',
            b.dataset.mode === state.mode
        );
    });

    // Timer button state.
    $('start').textContent =
        s?.status === 'running'
            ? 'Pause'
            : s?.status === 'paused'
                ? 'Resume'
                : 'Start';

    $('reset').disabled = !s;

    // Sound button.
    $('sound').textContent =
        state.sound ? '♪' : '♪̸';

    $('sound').title =
        state.sound
            ? 'Mute sound'
            : 'Enable sound';

    renderLog(now);
}


/* ================================
   Event Listeners
================================ */

// Timer controls.
$('start').onclick = startPause;
$('reset').onclick = stop;

// Duration editor.
$('edit').onclick = editDuration;
$('save-minutes').onclick = applyDuration;

$('cancel-edit').onclick = () => {
    $('editor').classList.add('hidden');
};

$('minutes').onkeydown = e => {
    if (e.key === 'Enter') {
        applyDuration();
    }

    if (e.key === 'Escape') {
        $('editor').classList.add('hidden');
    }
};

// Sound toggle.
$('sound').onclick = () => {
    state.sound = !state.sound;

    save();
    render();
};

// Timer mode selection.
$('modes').onclick = e => {
    const b = e.target.closest('[data-mode]');

    if (b) {
        switchMode(b.dataset.mode);
    }
};

// Date navigation.
$('prev').onclick = () => {
    viewDay = shiftDay(viewDay, -1);
    render();
};

$('next').onclick = () => {
    viewDay = shiftDay(viewDay, 1);
    render();
};

$('today').onclick = () => {
    viewDay = dayKey(Date.now());
    render();
};


/* ================================
   Browser State Recovery
================================ */

// Refresh when the tab becomes visible.
document.addEventListener(
    'visibilitychange',
    () => {
        if (!document.hidden) {
            render();
        }
    }
);

window.addEventListener(
    'focus',
    render
);

// Synchronize storage changes across tabs.
window.addEventListener(
    'storage',
    e => {
        if (e.key === KEY) {
            state = load();
            render();
        }
    }
);


/* ================================
   Timer Update Loop
================================ */

// setInterval only updates the display.
// Actual elapsed time uses timestamps.

setInterval(() => {
    const now = Date.now();

    // Automatically move the log to today
    // when midnight passes.
    if (
        dayKey(now) !== dayKey(lastPaint) &&
        viewDay === dayKey(lastPaint)
    ) {
        viewDay = dayKey(now);
    }

    lastPaint = now;

    render();

}, 500);


/* ================================
   Initialize
================================ */

lastPaint = Date.now();

render();

if (window.lucide) {
    lucide.createIcons();
}
