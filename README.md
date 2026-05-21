# cotd-map

Creatures of the Deep 인터랙티브 지도 프로젝트.

현재 구현:
- Leaflet.js 기반 맵
- 맵별 디렉터리 분리 구조
- 상단 스와이프(가로 스크롤) 맵 선택
- 확대/축소, 드래그
- 마커 + 팝업
- 검색/타입/시간대 필터
- Fandom 지도 리소스 우선 사용 (Marina는 대체 소스 유지)

디렉터리:
- `assets/maps/<map-slug>/background.jpg`
- `assets/maps/<map-slug>/data/clover/{fish,creatures,items,raw}.json`
- `assets/maps/<map-slug>/data/creatures/` (소스 분리 저장용)
- `content/maps/<map-slug>.js` (맵별 화면 로딩 데이터)
- `content/index.js` (맵 순서/등록)
- `tools/sync-resources.mjs` (리소스 동기화)
- `tools/build-map-modules.mjs` (화면용 맵 모듈 생성)

맵 순서 (Cloversalad + VIP):
1. Marina
2. Paradise Island
3. Great Lakes
4. Costa Rica
5. Alaska
6. Australia
7. Scotland
8. Thailand
9. Amazon
10. Chemical Plant
11. Nuclear Plant
12. Petrochemical Zone
13. Bermuda Triangle

실행:
- `index.html`을 브라우저에서 열면 동작합니다.

참고 리소스:
- https://cloversalad.com/maps/paradise/fish/?id=01
- https://creatures-of-the-deep-app.fandom.com/wiki/Map:Paradise_Island
