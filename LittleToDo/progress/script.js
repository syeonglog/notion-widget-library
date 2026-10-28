"use strict";

const LT = window.LittleThings;

function renderProgress() {

    const tasks = LT.loadTasks();

    const progress = LT.getTodayProgress(tasks);
    const summary = LT.getSummary(tasks);

    document.getElementById("currentDate").textContent =
        new Date().toLocaleDateString(
            "en-US",
            {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
            }
        );

    document.getElementById("progressCount").textContent =
        `${progress.completed} / ${progress.total}`;

    document.getElementById("progressFill").style.width =
        `${progress.percent}%`;

    document.getElementById("progressText").textContent =
        progress.total === 0
            ? "오늘도 작은 것부터 시작해 봐요 ♡"
            : `${progress.percent}% completed`;

    document.getElementById("todayCount").textContent =
        String(summary.today).padStart(2, "0");

    document.getElementById("tomorrowCount").textContent =
        String(summary.tomorrow).padStart(2, "0");

    document.getElementById("somedayCount").textContent =
        String(summary.someday).padStart(2, "0");
}

renderProgress();

// 같은 브라우저의 다른 iframe에서 데이터 변경 시 갱신
window.addEventListener("storage", renderProgress);

// 동일 문서에서 발생한 데이터 변경도 처리
window.addEventListener(
    LT.UPDATE_EVENT,
    renderProgress
);

// 노션 탭으로 돌아왔을 때 갱신
window.addEventListener("focus", renderProgress);

document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        renderProgress();
    }
});

// 날짜 변경 및 iframe 동기화를 위한 보조 갱신
setInterval(renderProgress, 30000);