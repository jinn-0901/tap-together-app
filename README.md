# 탭투게더 키오스크 (앱)

고령자도 쓰기 쉬운 카페 키오스크 화면이에요. 가족이 폰(리모컨)으로 같이 주문을 도와줄 수 있어요.

세 개의 프로그램이 같이 돌아가요.

```
키오스크 화면 (이 레포)  ←→  서버 (선생님이 운영, 다 같이 공유)  ←→  가족 리모컨 (tap-together-web 레포)
 tap-together-app             tap-together-server                   tap-together-web
```

여러분은 **앱(tap-together-app)과 웹(tap-together-web) 두 레포만 포크**하면 돼요. 서버는 선생님 서버를 같이 써요.

---

## 1. 내 사이트 만들기 (포크 → 배포)

`tap-together-app`과 `tap-together-web` **두 레포 모두** 아래를 똑같이 해요. 레포 이름은 바꾸지 마세요.

1. 레포 페이지 오른쪽 위 **Fork** → 내 계정으로 가져와요.
2. 내 레포의 **Actions** 탭 → 초록색 버튼(I understand my workflows, go ahead and enable them)을 눌러요.
3. **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 바꿔요.
4. **Actions** 탭 → 왼쪽 **Deploy to GitHub Pages** → **Run workflow** → 초록색 버튼. 1~2분 기다리면 초록 체크가 떠요.

내 사이트 주소는 이렇게 돼요 (`내아이디`는 내 GitHub 아이디).

- 키오스크: `https://내아이디.github.io/tap-together-app/`
- 리모컨: `https://내아이디.github.io/tap-together-web/`

## 2. 써보기

1. 컴퓨터에서 키오스크 주소를 열어요. 6자리 코드와 QR이 보여요.
2. 폰으로 QR을 찍으면 리모컨이 열리고 자동으로 연결돼요.
3. 첫 접속은 서버가 자고 있어서 30~60초 걸릴 수 있어요. 기다리면 돼요.

---

## 3. 메뉴 바꾸기 (직접 고치기)

바꾸는 파일은 **`src/data/menu.js` 하나**예요. **앱과 웹 두 레포의 파일을 똑같이** 고쳐야 해요.

| 바꾸고 싶은 것 | 어디를 고치나 |
| --- | --- |
| 메뉴 이름 | `MENU_NAMES` 안의 이름 |
| 가격, 이모지, 분류 | `MENU` 안의 `price`, `icon`, `category` |

예를 들어 아메리카노를 "초코빙수"로 바꾸려면 이렇게 해요.

```js
"americano": { ko: "초코빙수", en: "Choco Bingsu", zh: "巧克力刨冰", ja: "チョコかき氷", vi: "Choco Bingsu" },
```

- 오른쪽 `americano` 같은 **id는 바꾸지 마세요.** 이름만 바꿔요.
- 언어를 안 적으면 한국어 이름이 대신 나와요.
- 쉬운 화면(실제 메뉴 사진) 모드의 **사진은 서버에 있어서**, id가 그대로면 원래 메뉴 사진이 나와요. 이름만 바꾸면 사진은 그대로예요. 새로 추가한 메뉴는 사진이 없어서 이모지로 나와요.

**고치는 방법**: GitHub에서 `src/data/menu.js` 열기 → 오른쪽 위 연필 모양(Edit) → 고치기 → 오른쪽 위 **Commit changes** → **Commit changes**. 그러면 Actions가 자동으로 다시 배포해요. 1~2분 뒤 사이트를 새로고침(Ctrl+F5)하세요.

---

## 4. ChatGPT로 바꾸기 (바이브 코딩)

코드를 몰라도 ChatGPT에게 말로 시키면 돼요. 처음에 ChatGPT에게 이 프로젝트를 알려주는 준비만 하면 돼요.

### 준비 (한 번만)

1. 이 레포의 **`CHATGPT_PROMPT.md`** 파일을 열어서 내용을 전부 복사해요.
2. ChatGPT 새 채팅의 첫 메시지로 붙여넣고 보내요. (ChatGPT 설정의 "맞춤 설정 → 사용자 지정 지침"이나 프로젝트 지침에 넣어두면 새 채팅마다 안 붙여넣어도 돼요. 메뉴 위치는 ChatGPT 버전에 따라 달라요.)

### 시키기

1. GitHub에서 `src/data/menu.js`를 열고 **Raw** 또는 파일 내용 전체를 복사해요.
2. ChatGPT에게 이렇게 말해요. 아래는 예시예요.

   > 아래가 현재 menu.js야. 아메리카노를 "초코빙수"로 바꿔줘. 가격은 5000원, 이모지는 🍧로. 영어·중국어·일본어·베트남어 이름도 알아서 번역해줘.
   > (여기에 menu.js 전체 붙여넣기)

3. ChatGPT가 **수정된 파일 전체**를 코드 블록으로 줘요. 그걸 복사해요.

### 반영하기

1. GitHub에서 `src/data/menu.js` → 연필(Edit) → 안의 내용을 전부 지우고 복사한 내용으로 바꿔요 → **Commit changes**.
2. **웹 레포(tap-together-web)에서도 똑같이** 해요. ChatGPT가 준 같은 내용을 붙여넣으면 돼요.
3. 두 레포의 Actions 탭에서 초록 체크가 뜨면 사이트를 새로고침(Ctrl+F5)해서 확인해요.

### 더 자동으로 하고 싶다면 (선택, 유료 플랜)

ChatGPT의 **Codex**는 GitHub 레포를 직접 읽고 수정안을 만들어 줘요. 이 레포의 `AGENTS.md`를 읽도록 되어 있어서 프로젝트 규칙을 미리 알고 시작해요.

1. chatgpt.com/codex에서 GitHub 계정을 연결하고, 내 포크 레포를 선택해요.
2. "메뉴 이름을 ○○로 바꿔줘"처럼 말로 요청하면 변경안(Pull Request)을 만들어 줘요.
3. 변경 내용을 확인하고 **Merge** 하면 자동으로 배포돼요.

> ChatGPT의 일반 GitHub 연결(커넥터)은 코드를 **읽기만** 해요. 고치는 건 Codex가 해요. 어떤 요금제에서 Codex를 쓸 수 있는지, 무료 사용량이 얼마인지는 자주 바뀌니 OpenAI 안내를 직접 확인하세요. 무료 계정이면 위의 "복사해서 붙여넣기" 방법을 쓰면 돼요.

### 조심할 점

- 비밀번호, 토큰, 개인정보는 ChatGPT에 절대 붙여넣지 마세요. 이 프로젝트의 파일에는 그런 게 없어요.
- ChatGPT가 `menu.js` 말고 다른 파일을 고치라고 하면 일단 멈추고 선생님께 물어보세요.
- ChatGPT가 준 코드는 꼭 앱과 웹 **두 곳**에 넣어야 해요. 한쪽만 하면 키오스크와 리모컨의 이름이 서로 달라요.

---

## 5. 안 될 때

| 증상 | 확인할 것 |
| --- | --- |
| Actions에 빨간 ✗가 떠요 | 방금 고친 파일에서 따옴표(`"`)나 쉼표(`,`)를 지웠을 수 있어요. ChatGPT에게 에러 내용을 붙여넣고 고쳐 달라고 하세요. |
| 고쳤는데 그대로예요 | 배포에 1~2분 걸려요. Actions가 초록이 된 뒤 Ctrl+F5로 새로고침하세요. |
| 키오스크는 바뀌었는데 리모컨은 안 바뀌었어요 | 웹 레포의 `menu.js`도 똑같이 고쳤는지 확인하세요. |
| 리모컨이 연결이 안 돼요 | 서버가 자고 있을 수 있어요. 1분 뒤 다시 시도하세요. |
| 사이트가 404예요 | Settings → Pages의 Source가 GitHub Actions인지, 레포 이름을 바꾸지 않았는지 확인하세요. |

## 참고: 다른 서버를 쓰고 싶을 때 (고급)

레포 **Settings → Secrets and variables → Actions → Variables**에서 `REACT_APP_SERVER_URL`을 만들면 기본 서버 대신 그 주소를 써요. 앱 레포에서는 `REACT_APP_REMOTE_SITE_URL`로 QR이 가리킬 리모컨 주소도 바꿀 수 있어요. 바꾼 뒤 Actions에서 **Run workflow**를 다시 실행하세요.
