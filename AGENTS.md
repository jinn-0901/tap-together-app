# 이 프로젝트 안내 (AI 도우미용)

할머니, 할아버지도 쉽게 쓰는 카페 주문 기계(키오스크) 화면이야. 이 저장소는 `tap-together-app`(키오스크 화면)이고, 짝이 되는 `tap-together-web`(폰 리모컨)이 따로 있어. 두 곳의 메뉴판(`src/data/menu.js`)은 **항상 똑같아야 해.**

사용자는 초등학생이야. 어려운 말(저장소, 커밋, 배포, 브랜치 같은 말)을 쓰지 말고, 짧고 쉬운 한국어로 두세 문장만 말해 줘.

## 할 일: 메뉴 바꾸기
메뉴 요청(이름, 가격, 이모지, 새 메뉴, 지우기)은 **`src/data/menu.js` 하나만** 고쳐. 메뉴 하나는 `{ }` 한 덩어리야.

```js
{
  id: "americano",
  category: "coffee",
  price: 3000,
  icon: "☕",
  photo: "americano.jpg",
  names: { ko: "아메리카노", en: "Americano", zh: "美式咖啡", ja: "アメリカーノ", vi: "Americano" },
  whip: false,
  iceOnly: false,
},
```

- `id`: 영어 소문자, 숫자, 하이픈. 다른 메뉴와 겹치면 안 돼. **이미 있는 id는 바꾸지 마.**
- `category`: `coffee`, `latte`, `tea`, `ade` 중 하나(새 분류는 만들 수 없어).
- `price`: 가격(원, 숫자).
- `icon`: 이모지 하나.
- `photo`: 사진 파일 이름. 사진은 `public/menu-images/`에 있어. 없으면 화면에 이모지가 대신 나와.
- `names`: 5개 나라 말(ko, en, zh, ja, vi). 이름을 바꾸면 5개를 모두 자연스럽게 번역해서 채워.
- `whip`: true면 휘핑크림 선택 가능. `iceOnly`: true면 차가운 것만.

### 요청별 방법
- 이름 바꾸기: 그 메뉴의 `names` 5개를 바꿔.
- 가격/이모지: `price`, `icon`만 바꿔.
- 새 메뉴: 덩어리 하나를 복사해 마지막에 붙이고 새 `id`, `category`, `price`, `icon`, `photo`(`id.jpg`), `names`를 채워.
- 지우기: 덩어리를 통째로 지워(쉼표와 중괄호가 깨지지 않게).
- 사진 바꾸기: 너는 사진을 못 만들어. 사용자에게 "GitHub에서 `public` → `menu-images` 폴더에 같은 이름의 사진(jpg)을 올려 주세요"라고 알려 줘.

## 꼭 지킬 것
- 따옴표, 쉼표, 중괄호가 하나도 깨지지 않게 해. 고친 뒤 파일이 문법에 맞는지 확인해.
- `menu.js` 맨 위의 `CATEGORIES`와 덩어리 아래 "자동으로 만들어져요" 부분은 건드리지 마.
- `menu.js`와 `public/menu-images/` 말고 다른 파일, `.github` 폴더, `.env`, `package.json`은 고치지 마.
- 일이 끝나면 이렇게 알려 줘: "이 일을 **tap-together-web 에서도 똑같이** 시켜야 해요. 합치기(Merge)를 하면 1~2분 뒤 사이트가 바뀌어요. 그다음 Ctrl+F5."
- 욕설이나 나쁜 말은 메뉴 이름으로 만들지 마. 비밀번호 같은 개인 정보는 쓰지 말라고 알려 줘.
