
const datesContainer = document.getElementById("dates");
const subtitle = document.getElementById("subtitle");

let currentDate = new Date();
let selectedDate = new Date();

function renderCalendar() {
  datesContainer.innerHTML = "";

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // 현재 표시 중인 연도와 월
  const monthName = currentDate.toLocaleString("en-US", {
    month: "long"
  });

  subtitle.textContent =
    `${monthName} ${year} · a little moment for today`;

  // 해당 월의 시작 요일과 마지막 날짜
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();

  // 달력을 주 단위로 채우기
  const totalCells = Math.ceil(
    (firstDay + lastDate) / 7
  ) * 7;

  for (let i = 0; i < totalCells; i++) {
    const date = new Date(year, month, 1 - firstDay + i);

    const day = document.createElement("button");
    day.classList.add("day");
    day.textContent = date.getDate();

    // 이전 달 및 다음 달 날짜
    if (date.getMonth() !== month) {
      day.classList.add("other-month");
    }

    // 선택한 날짜 표시
    if (
      date.getFullYear() === selectedDate.getFullYear() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getDate() === selectedDate.getDate()
    ) {
      day.classList.add("selected");
    }

    // 날짜 클릭 시 선택
    day.addEventListener("click", () => {
      selectedDate = new Date(date);
      currentDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        1
      );
      renderCalendar();
    });

    datesContainer.appendChild(day);
  }
}

// 이전 달 이동
document.getElementById("prev").addEventListener("click", () => {
  currentDate.setDate(1);
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
});

// 다음 달 이동
document.getElementById("next").addEventListener("click", () => {
  currentDate.setDate(1);
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
});

// 최초 실행
renderCalendar();