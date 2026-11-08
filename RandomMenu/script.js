/* ==============================
   메뉴 데이터
   [이름, 카테고리, 조리시간, 난이도]
============================== */

const menuData = [

    // ==========================
    // 한식 (40)
    // ==========================

    ["김치찌개", "한식", 30, "쉬움"],
    ["된장찌개", "한식", 25, "쉬움"],
    ["순두부찌개", "한식", 25, "쉬움"],
    ["부대찌개", "한식", 30, "보통"],
    ["청국장", "한식", 30, "보통"],
    ["소고기 미역국", "한식", 35, "보통"],
    ["콩나물국", "한식", 20, "쉬움"],
    ["계란국", "한식", 10, "쉬움"],
    ["북엇국", "한식", 25, "쉬움"],
    ["소고기뭇국", "한식", 40, "보통"],
    ["어묵국", "한식", 20, "쉬움"],
    ["떡국", "한식", 25, "쉬움"],
    ["김치볶음밥", "한식", 15, "쉬움"],
    ["계란볶음밥", "한식", 15, "쉬움"],
    ["참치주먹밥", "한식", 10, "쉬움"],
    ["멸치주먹밥", "한식", 10, "쉬움"],
    ["비빔밥", "한식", 30, "보통"],
    ["참치비빔밥", "한식", 10, "쉬움"],
    ["불고기덮밥", "한식", 25, "보통"],
    ["제육덮밥", "한식", 25, "보통"],
    ["제육볶음", "한식", 25, "보통"],
    ["소불고기", "한식", 30, "보통"],
    ["닭갈비", "한식", 35, "보통"],
    ["찜닭", "한식", 50, "보통"],
    ["닭볶음탕", "한식", 50, "보통"],
    ["고등어구이", "한식", 20, "쉬움"],
    ["삼치구이", "한식", 20, "쉬움"],
    ["두부조림", "한식", 20, "쉬움"],
    ["두부부침", "한식", 15, "쉬움"],
    ["계란말이", "한식", 15, "쉬움"],
    ["계란찜", "한식", 15, "쉬움"],
    ["감자조림", "한식", 25, "쉬움"],
    ["애호박볶음", "한식", 15, "쉬움"],
    ["버섯볶음", "한식", 15, "쉬움"],
    ["시금치나물", "한식", 15, "쉬움"],
    ["콩나물무침", "한식", 15, "쉬움"],
    ["잡채", "한식", 40, "보통"],
    ["잔치국수", "한식", 30, "보통"],
    ["비빔국수", "한식", 20, "쉬움"],
    ["김치전", "한식", 20, "쉬움"],


    // ==========================
    // 양식 (30)
    // ==========================

    ["토마토 파스타", "양식", 20, "쉬움"],
    ["크림 파스타", "양식", 25, "쉬움"],
    ["알리오 올리오", "양식", 20, "쉬움"],
    ["봉골레 파스타", "양식", 30, "보통"],
    ["로제 파스타", "양식", 25, "쉬움"],
    ["버섯크림파스타", "양식", 25, "쉬움"],
    ["바질페스토 파스타", "양식", 20, "쉬움"],
    ["미트볼 파스타", "양식", 35, "보통"],
    ["라자냐", "양식", 60, "어려움"],
    ["치킨 리조또", "양식", 30, "보통"],
    ["버섯 리조또", "양식", 30, "보통"],
    ["토마토 리조또", "양식", 30, "보통"],
    ["오믈렛", "양식", 15, "쉬움"],
    ["스크램블 에그", "양식", 10, "쉬움"],
    ["에그 베네딕트", "양식", 30, "보통"],
    ["프렌치토스트", "양식", 15, "쉬움"],
    ["팬케이크", "양식", 20, "쉬움"],
    ["햄치즈 샌드위치", "양식", 10, "쉬움"],
    ["에그 샌드위치", "양식", 15, "쉬움"],
    ["치킨 샌드위치", "양식", 20, "쉬움"],
    ["BLT 샌드위치", "양식", 15, "쉬움"],
    ["감자수프", "양식", 30, "보통"],
    ["양송이수프", "양식", 30, "보통"],
    ["토마토수프", "양식", 30, "쉬움"],
    ["치킨스테이크", "양식", 30, "보통"],
    ["함박스테이크", "양식", 40, "보통"],
    ["소고기스테이크", "양식", 25, "보통"],
    ["감자 그라탱", "양식", 45, "보통"],
    ["카프레제 샐러드", "양식", 10, "쉬움"],
    ["시저 샐러드", "양식", 15, "쉬움"],


    // ==========================
    // 일식 (30)
    // ==========================

    ["오야코동", "일식", 20, "쉬움"],
    ["규동", "일식", 25, "보통"],
    ["가츠동", "일식", 35, "보통"],
    ["텐동", "일식", 40, "보통"],
    ["사케동", "일식", 15, "쉬움"],
    ["참치마요덮밥", "일식", 10, "쉬움"],
    ["일본식 카레라이스", "일식", 30, "쉬움"],
    ["카레우동", "일식", 20, "쉬움"],
    ["야키우동", "일식", 20, "쉬움"],
    ["야키소바", "일식", 25, "쉬움"],
    ["우동", "일식", 20, "쉬움"],
    ["냉소바", "일식", 20, "쉬움"],
    ["메밀소바", "일식", 20, "쉬움"],
    ["돈코츠라멘", "일식", 60, "어려움"],
    ["미소라멘", "일식", 35, "보통"],
    ["쇼유라멘", "일식", 35, "보통"],
    ["오코노미야키", "일식", 30, "보통"],
    ["타코야키", "일식", 40, "보통"],
    ["돈가스", "일식", 35, "보통"],
    ["치킨가스", "일식", 35, "보통"],
    ["새우튀김", "일식", 30, "보통"],
    ["고로케", "일식", 45, "보통"],
    ["일본식 계란말이", "일식", 20, "보통"],
    ["차완무시", "일식", 25, "보통"],
    ["유부초밥", "일식", 20, "쉬움"],
    ["연어초밥", "일식", 30, "보통"],
    ["참치초밥", "일식", 30, "보통"],
    ["오니기리", "일식", 15, "쉬움"],
    ["데리야키 치킨", "일식", 30, "보통"],
    ["일본식 감자조림", "일식", 35, "보통"],


    // ==========================
    // 중식 (25)
    // ==========================

    ["토마토 달걀볶음", "중식", 10, "쉬움"],
    ["마파두부", "중식", 25, "보통"],
    ["새우볶음밥", "중식", 15, "쉬움"],
    ["계란볶음밥(중식)", "중식", 15, "쉬움"],
    ["짜장면", "중식", 40, "보통"],
    ["짬뽕", "중식", 45, "보통"],
    ["볶음짬뽕", "중식", 35, "보통"],
    ["잡채밥", "중식", 40, "보통"],
    ["고추잡채", "중식", 30, "보통"],
    ["양장피", "중식", 50, "어려움"],
    ["탕수육", "중식", 45, "보통"],
    ["깐풍기", "중식", 40, "보통"],
    ["유린기", "중식", 40, "보통"],
    ["라조기", "중식", 40, "보통"],
    ["칠리새우", "중식", 30, "보통"],
    ["크림새우", "중식", 30, "보통"],
    ["청경채볶음", "중식", 15, "쉬움"],
    ["굴소스 버섯볶음", "중식", 15, "쉬움"],
    ["가지볶음", "중식", 20, "쉬움"],
    ["돼지고기 숙주볶음", "중식", 20, "쉬움"],
    ["마라샹궈", "중식", 35, "보통"],
    ["마라탕", "중식", 30, "쉬움"],
    ["중국식 계란탕", "중식", 15, "쉬움"],
    ["군만두", "중식", 20, "쉬움"],
    ["중국식 볶음면", "중식", 25, "쉬움"],


    // ==========================
    // 기타 (25)
    // ==========================

    ["월남쌈", "기타", 30, "쉬움"],
    ["쌀국수", "기타", 40, "보통"],
    ["팟타이", "기타", 30, "보통"],
    ["팟카파오무쌉", "기타", 25, "보통"],
    ["똠얌꿍", "기타", 40, "보통"],
    ["나시고렝", "기타", 25, "보통"],
    ["미고렝", "기타", 25, "보통"],
    ["베트남식 반미", "기타", 20, "쉬움"],
    ["분짜", "기타", 45, "보통"],
    ["그린커리", "기타", 35, "보통"],
    ["버터치킨커리", "기타", 45, "보통"],
    ["키마커리", "기타", 30, "보통"],
    ["치킨 케사디야", "기타", 20, "쉬움"],
    ["비프 타코", "기타", 25, "쉬움"],
    ["치킨 부리토", "기타", 30, "보통"],
    ["부리토볼", "기타", 25, "쉬움"],
    ["과카몰리", "기타", 15, "쉬움"],
    ["후무스", "기타", 20, "쉬움"],
    ["샥슈카", "기타", 25, "쉬움"],
    ["그릭요거트볼", "기타", 5, "쉬움"],
    ["오버나이트 오트밀", "기타", 10, "쉬움"],
    ["아보카도 토스트", "기타", 10, "쉬움"],
    ["과일 샐러드", "기타", 10, "쉬움"],
    ["두부 샐러드", "기타", 15, "쉬움"],
    ["닭가슴살 샐러드", "기타", 20, "쉬움"]

];


/* ==============================
   데이터 변환
============================== */

const menus = menuData.map((menu, index) => ({
    id: index,
    name: menu[0],
    category: menu[1],
    time: menu[2],
    difficulty: menu[3]
}));


/* ==============================
   DOM
============================== */

const categoryFilter = document.getElementById("categoryFilter");
const timeFilter = document.getElementById("timeFilter");

const menuName = document.getElementById("menuName");
const menuCategory = document.getElementById("menuCategory");
const menuTime = document.getElementById("menuTime");
const menuDifficulty = document.getElementById("menuDifficulty");

const shuffleBtn = document.getElementById("shuffleBtn");
const favoriteBtn = document.getElementById("favoriteBtn");


/* ==============================
   즐겨찾기 저장
============================== */

const FAVORITES_KEY = "whatToCookFavorites";

function loadFavorites() {
    try {
        const data = JSON.parse(
            localStorage.getItem(FAVORITES_KEY) || "[]"
        );

        if (!Array.isArray(data)) return [];

        return data.filter(id =>
            Number.isInteger(id) &&
            id >= 0 &&
            id < menus.length
        );

    } catch (error) {
        return [];
    }
}

let favorites = loadFavorites();


function saveFavorites() {
    try {
        localStorage.setItem(
            FAVORITES_KEY,
            JSON.stringify(favorites)
        );
    } catch (error) {
        console.warn("즐겨찾기를 저장하지 못했습니다.");
    }
}


/* ==============================
   현재 메뉴
============================== */

let currentMenu = menus.find(menu =>
    menu.name === "토마토 달걀볶음"
);


/* ==============================
   메뉴 출력
============================== */

function renderMenu() {

    if (!currentMenu) {

        menuName.textContent = "추천할 메뉴가 없어요";
        menuCategory.textContent = "조건을 변경해 주세요";
        menuTime.textContent = "";
        menuDifficulty.textContent = "";

        document.querySelectorAll(".dot").forEach(dot => {
            dot.style.display = "none";
        });

        favoriteBtn.textContent = "♡";
        favoriteBtn.classList.remove("active");
        favoriteBtn.disabled = true;
        favoriteBtn.setAttribute("aria-pressed", "false");

        return;
    }

    document.querySelectorAll(".dot").forEach(dot => {
        dot.style.display = "";
    });

    favoriteBtn.disabled = false;

    menuName.textContent = currentMenu.name;
    menuCategory.textContent = currentMenu.category;
    menuTime.textContent = `${currentMenu.time} min`;
    menuDifficulty.textContent = currentMenu.difficulty;

    updateFavoriteButton();
}


/* ==============================
   즐겨찾기 버튼
============================== */

function updateFavoriteButton() {

    if (!currentMenu) return;

    const isFavorite = favorites.includes(currentMenu.id);

    favoriteBtn.textContent = isFavorite ? "♥" : "♡";

    favoriteBtn.classList.toggle(
        "active",
        isFavorite
    );

    favoriteBtn.setAttribute(
        "aria-pressed",
        String(isFavorite)
    );

    favoriteBtn.title = isFavorite
        ? "즐겨찾기 해제"
        : "즐겨찾기 추가";
}


function toggleFavorite() {

    if (!currentMenu) return;

    const index = favorites.indexOf(currentMenu.id);

    if (index === -1) {
        favorites.push(currentMenu.id);
    } else {
        favorites.splice(index, 1);
    }

    saveFavorites();
    updateFavoriteButton();

    // 즐겨찾기 필터에서 해제한 메뉴는 목록에서 제외
    if (
        categoryFilter.value === "즐겨찾기" &&
        !favorites.includes(currentMenu.id)
    ) {
        recommendMenu();
    }
}


/* ==============================
   필터 적용
============================== */

function getFilteredMenus() {

    const category = categoryFilter.value;
    const time = timeFilter.value;

    return menus.filter(menu => {

        // 음식 종류
        const categoryMatch =
            category === "전체" ||
            menu.category === category ||
            (
                category === "즐겨찾기" &&
                favorites.includes(menu.id)
            );

        // 조리 시간
        const timeMatch =
            time === "all" ||
            menu.time <= Number(time);

        return categoryMatch && timeMatch;

    });
}


/* ==============================
   랜덤 메뉴 추천
============================== */

function recommendMenu() {

    const filteredMenus = getFilteredMenus();

    if (filteredMenus.length === 0) {
        currentMenu = null;
        renderMenu();
        return;
    }

    // 직전에 추천된 메뉴를 가능하면 제외
    let candidates = filteredMenus.filter(menu =>
        !currentMenu || menu.id !== currentMenu.id
    );

    // 조건에 맞는 메뉴가 하나뿐이면 해당 메뉴 허용
    if (candidates.length === 0) {
        candidates = filteredMenus;
    }

    const randomIndex = Math.floor(
        Math.random() * candidates.length
    );

    currentMenu = candidates[randomIndex];

    renderMenu();
}


/* ==============================
   이벤트
============================== */

shuffleBtn.addEventListener(
    "click",
    recommendMenu
);

categoryFilter.addEventListener(
    "change",
    recommendMenu
);

timeFilter.addEventListener(
    "change",
    recommendMenu
);

favoriteBtn.addEventListener(
    "click",
    toggleFavorite
);


/* ==============================
   초기 실행
============================== */

renderMenu();