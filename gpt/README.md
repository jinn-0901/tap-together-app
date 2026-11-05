# 우리 반 GPT 만들기 (만드는 사람용)

학생이 ChatGPT에서 **"아메리카노를 초코빙수로 바꿔 줘"** 라고 말하면, GPT가 학생의 GitHub 프로젝트를 직접 고치게 만드는 방법이에요. 한 번만 만들어 두고 **링크를 학생들에게 나눠 주면** 돼요.

## 어떻게 움직이나요

```
학생이 말해요 → GPT가 "무엇을 바꿀지"만 작은 글(JSON)로 정리해요
   → GitHub의 Edit menu (ChatGPT helper) 작업이 실행돼요 (tap-together-app, tap-together-web 둘 다)
   → 작업이 menu.js 를 검사하면서 고치고 → 저장하고 → 사이트를 다시 올려요
```

GPT가 파일 전체를 다시 쓰지 않아요. 이상한 요청이나 고쳤더니 코드가 깨지는 경우는 **작업이 스스로 막고 아무것도 저장하지 않아요.**

## 준비물

- GPT를 만들 수 있는 ChatGPT 계정 (보통 유료 요금제가 필요해요. 정확한 조건은 직접 확인해 주세요.)
- GitHub 계정
- 학생들은 두 프로젝트를 Fork 하고 Actions를 켜 둔 상태여야 해요. (앱 README 1번)

---

## 1단계: GitHub에서 로그인용 앱 만들기

학생이 "GitHub로 로그인"을 눌렀을 때 쓰는 앱이에요.

1. GitHub 오른쪽 위 내 사진 → **Settings** → 왼쪽 맨 아래 **Developer settings** → **OAuth Apps** → **New OAuth App**
2. 이렇게 채워요.
   - Application name: `탭투게더 메뉴 도우미`
   - Homepage URL: `https://github.com/jinn-0901/tap-together-app`
   - Authorization callback URL: `https://chatgpt.com/aip/g-임시/oauth/callback` (일단 아무거나. 4단계에서 진짜 주소로 바꿔요)
3. **Register application** → 나오는 **Client ID** 를 복사해 둬요.
4. **Generate a new client secret** → 나오는 비밀 글자를 바로 복사해 둬요. (한 번만 보여 줘요. 이 글자는 GitHub 프로젝트나 채팅에 올리지 마세요.)

## 2단계: GPT 만들기

1. chatgpt.com 왼쪽 **GPT 탐색(Explore GPTs)** → **만들기(Create)** → **구성(Configure)** 탭
2. 이렇게 채워요.
   - 이름: `탭투게더 메뉴 도우미`
   - 설명: `말로 시키면 내 키오스크 메뉴를 바꿔 줘요`
   - 지침(Instructions): [`instructions.md`](instructions.md) 의 `여기부터`~`여기까지` 사이 글을 전부 붙여넣어요.
   - 대화 시작 예시: `아메리카노 이름을 초코빙수로 바꿔 줘` / `딸기라떼 가격을 5000원으로 바꿔 줘` / `새 메뉴 만들어 줘`
   - 기능(Capabilities): 웹 검색, 이미지 만들기, 코드 인터프리터를 모두 꺼요. 필요 없어요.

## 3단계: GitHub 연결(액션) 넣기

1. 구성 탭 맨 아래 **새 작업 만들기(Create new action)**
2. **인증(Authentication)** → **OAuth** 를 고르고 채워요.
   - Client ID: 1단계에서 복사한 것
   - Client Secret: 1단계에서 복사한 비밀 글자
   - Authorization URL: `https://github.com/login/oauth/authorize`
   - Token URL: `https://github.com/login/oauth/access_token`
   - Scope: `public_repo`
   - Token Exchange Method: `Default (POST request)`
3. **스키마(Schema)** 칸에 [`actions-schema.yaml`](actions-schema.yaml) 전체를 붙여넣어요. 아래에 `getAuthenticatedUser`, `runEditMenu`, `getWorkflowRuns` 세 개가 보이면 잘 된 거예요.
4. **개인정보처리방침 URL(Privacy policy)**: `https://jinn-0901.github.io/tap-together-app/privacy.html`
   (이 주소는 앱 사이트가 인터넷에 올라간 뒤에 열려요.)
5. 오른쪽 위 **만들기/업데이트(Create/Update)** → 공유 범위를 **링크가 있는 모든 사람** 으로 하고 저장해요.

## 4단계: 로그인 주소(Callback URL) 바로잡기

1. 저장한 GPT의 작업 설정 화면 아래쪽에 **Callback URL** 이 보여요. (`https://chatgpt.com/aip/g-…/oauth/callback` 모양) 복사해요.
2. GitHub의 OAuth App 설정으로 돌아가 **Authorization callback URL** 에 붙여넣고 **Update application** 을 눌러요.

## 5단계: 시험해 보기

1. GPT 링크를 열고 `아메리카노 이름을 초코빙수로 바꿔 줘` 라고 말해요.
2. **Sign in with github.com** 버튼이 나오면 눌러서 허용해요. (처음 한 번만)
3. 맞는지 확인해 주세요 → 응 → GPT가 두 프로젝트에 작업을 시작해요.
4. GitHub 내 프로젝트의 **Actions** 탭에서 `Edit menu (ChatGPT helper)` 가 초록 ✓ 가 되고, 이어서 `Deploy to GitHub Pages` 도 돌아가는지 봐요.
5. 1~2분 뒤 사이트를 Ctrl+F5 로 새로고침해서 이름이 바뀌었는지 봐요.
6. 원래대로 `초코빙수를 아메리카노로 돌려 줘` 라고 시켜요.

가능하면 **학생과 같은 조건(무료 계정, 다른 GitHub 계정)** 으로도 한 번 해 보세요. 무료 계정에서 열리는지는 제가 확인하지 못했어요.

## 6단계: 학생들에게 링크 나눠 주기

GPT 링크를 앱 `README.md` 의 `(여기에 GPT 링크)` 자리에 붙여넣거나 따로 알려 주세요.

---

## 안 될 때

| 증상 | 이렇게 해 보세요 |
| --- | --- |
| 로그인 뒤에 계속 오류가 나요 | 3단계 Token URL, Scope, Callback URL(4단계)을 다시 확인하세요. GitHub와 ChatGPT가 로그인 정보를 주고받는 방식 때문에 생길 수도 있는데, 이 부분은 제가 직접 시험하지 못했어요. 오류 글을 알려 주세요. |
| `Resource not accessible` / 403 | Scope를 `public_repo` 에서 `repo` 로 바꾸고 GPT를 업데이트한 뒤 다시 로그인해 보세요. |
| `Not Found` / 404 | 그 학생의 프로젝트에 `edit-menu.yml` 이 없는 거예요. Fork 한 프로젝트 페이지에서 **Sync fork → Update branch** 를 누르거나, 새로 Fork 하게 하세요. 그리고 Actions가 켜져 있는지 보세요. |
| 작업이 빨간 ✗ | 결과 페이지의 빨간 글자를 보세요. `id 가 ... 없어요` 면 메뉴 id가 달라서예요. 메뉴판에서 `id:` 옆 글자를 확인하세요. |
| 학생 계정에서 GPT가 안 열려요 | 무료 계정 제한일 수 있어요. 그때는 앱 README의 "복사해서 붙여넣기" 방법을 쓰세요. |

## 알아두세요

- 학생이 로그인할 때 GitHub가 "공개 프로젝트에 쓰기 권한" 을 요청한다고 보여 줘요. 이 권한은 그 학생의 공개 프로젝트 전체에 쓸 수 있는 큰 권한이에요. GPT는 `tap-together-app`, `tap-together-web` 의 `edit-menu.yml` 만 실행하도록 막아 두었지만, 권한 자체는 넓다는 걸 학생(보호자)에게 알려 주세요. 학생은 GitHub Settings → Applications 에서 언제든 끊을 수 있어요.
- 로그인 정보(토큰)는 ChatGPT가 보관하고, 만든 사람은 볼 수 없어요. Client Secret만 비밀로 지키면 돼요.
- 메뉴 수정은 한 번에 한 가지씩 차례로 처리돼요. 여러 학생이 동시에 써도 각자 자기 프로젝트에서 돌아가요.
