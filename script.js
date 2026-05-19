// 페이지가 완전히 로드된 후 실행
document.addEventListener("DOMContentLoaded", () => {
  console.log("COTD Map이 성공적으로 로드되었습니다!");

  // 검색 입력창 가져오기
  const searchInput = document.getElementById("searchInput");

  // 지도 영역 가져오기
  const map = document.getElementById("map");

  // 검색창에 입력할 때마다 실행
  searchInput.addEventListener("input", () => {
    const keyword = searchInput.value.trim();

    // 입력한 검색어를 지도 영역에 표시
    if (keyword === "") {
      map.textContent =
        "지도 영역 (나중에 Paradise Island 지도가 표시됩니다)";
    } else {
      map.textContent = `검색어: ${keyword}`;
    }

    // 개발자용 콘솔 출력
    console.log("검색어:", keyword);
  });
});