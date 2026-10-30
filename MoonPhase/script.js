/* ==============================
   Moon Phase 설정
============================== */

// 평균 삭망월 (일)
const LUNAR_CYCLE = 29.530588853;

// 기준 신월 (UTC)
const KNOWN_NEW_MOON =
    Date.UTC(2000, 0, 6, 18, 14);

/* ==============================
   달 위상 계산
============================== */

function getMoonPhase(date = new Date()) {

    const elapsedDays =
        (date.getTime() - KNOWN_NEW_MOON)
        / 86400000;

    // 0 ~ 1 사이 위상
    const phase =
        ((elapsedDays / LUNAR_CYCLE) % 1 + 1) % 1;

    // 달 밝기 계산
    const illumination =
        (1 - Math.cos(2 * Math.PI * phase)) / 2;

    return {
        phase,
        illumination,
        percent: Math.round(illumination * 100)
    };
}

/* ==============================
   달 이름 구분
============================== */

function getMoonName(phase) {

    if (phase < 0.035 || phase >= 0.965) {
        return {
            en: "New Moon",
            ko: "삭 · 새로운 달"
        };
    }

    if (phase < 0.215) {
        return {
            en: "Waxing Crescent",
            ko: "차오르는 초승달"
        };
    }

    if (phase < 0.285) {
        return {
            en: "First Quarter",
            ko: "상현달"
        };
    }

    if (phase < 0.465) {
        return {
            en: "Waxing Gibbous",
            ko: "차오르는 달"
        };
    }

    if (phase < 0.535) {
        return {
            en: "Full Moon",
            ko: "보름달"
        };
    }

    if (phase < 0.715) {
        return {
            en: "Waning Gibbous",
            ko: "기우는 달"
        };
    }

    if (phase < 0.785) {
        return {
            en: "Last Quarter",
            ko: "하현달"
        };
    }

    return {
        en: "Waning Crescent",
        ko: "기우는 그믐달"
    };
}

/* ==============================
   달 그리기
============================== */

function drawMoon(phase) {

    const canvas =
        document.getElementById("moonCanvas");

    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    const width = canvas.width;
    const height = canvas.height;

    const centerX = width / 2;
    const centerY = height / 2;

    const radius = 78;

    ctx.clearRect(0, 0, width, height);

    // 어두운 달의 기본 원
    ctx.beginPath();

    ctx.arc(
        centerX,
        centerY,
        radius,
        0,
        Math.PI * 2
    );

    ctx.fillStyle = "#CFC9C6";
    ctx.fill();

    // 밝은 영역 계산
    const angle = 2 * Math.PI * phase;
    const waxing = phase <= 0.5;

    ctx.save();

    ctx.beginPath();

    ctx.arc(
        centerX,
        centerY,
        radius,
        0,
        Math.PI * 2
    );

    ctx.clip();

    ctx.fillStyle = "#FFF4D6";

    // 가로 한 줄씩 달의 밝은 부분을 그림
    for (let y = -radius; y <= radius; y += 0.5) {

        const halfWidth =
            Math.sqrt(
                Math.max(0, radius * radius - y * y)
            );

        if (waxing) {

            // 차오르는 달: 오른쪽이 밝음
            const boundary =
                Math.cos(angle) * halfWidth;

            const startX = centerX + boundary;
            const endX = centerX + halfWidth;

            ctx.fillRect(
                startX,
                centerY + y,
                Math.max(0, endX - startX),
                0.7
            );

        } else {

            // 기우는 달: 왼쪽이 밝음
            const boundary =
                -Math.cos(angle) * halfWidth;

            const startX = centerX - halfWidth;
            const endX = centerX + boundary;

            ctx.fillRect(
                startX,
                centerY + y,
                Math.max(0, endX - startX),
                0.7
            );
        }
    }

    ctx.restore();

    // 달 표면의 은은한 질감
    ctx.save();

    ctx.beginPath();

    ctx.arc(
        centerX,
        centerY,
        radius,
        0,
        Math.PI * 2
    );

    ctx.clip();

    const craters = [
        { x: -20, y: -25, r: 8 },
        { x: 28, y: 14, r: 12 },
        { x: -5, y: 35, r: 7 },
        { x: 37, y: -35, r: 5 }
    ];

    craters.forEach(crater => {

        ctx.beginPath();

        ctx.arc(
            centerX + crater.x,
            centerY + crater.y,
            crater.r,
            0,
            Math.PI * 2
        );

        ctx.fillStyle = "rgba(120, 100, 85, 0.045)";
        ctx.fill();
    });

    ctx.restore();
}

/* ==============================
   날짜 표시
============================== */

function formatDate(date) {

    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric"
    });
}

/* ==============================
   화면 업데이트
============================== */

function updateMoonWidget() {

    const now = new Date();

    const moon = getMoonPhase(now);
    const name = getMoonName(moon.phase);

    document.getElementById("moonName")
        .textContent = name.en;

    document.getElementById("moonNameKo")
        .textContent = name.ko;

    document.getElementById("moonPercent")
        .textContent = `${moon.percent}%`;

    document.getElementById("moonDate")
        .textContent = formatDate(now);

    drawMoon(moon.phase);
}

/* ==============================
   초기 실행
============================== */

updateMoonWidget();

// 1시간마다 갱신
setInterval(updateMoonWidget, 60 * 60 * 1000);

// 화면에 다시 돌아오면 갱신
document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        updateMoonWidget();
    }
});