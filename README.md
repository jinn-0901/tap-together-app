# 탭투게더 키오스크

할머니, 할아버지도 쉽게 쓰는 **주문 기계(키오스크) 화면**이에요. 가족은 **폰 리모컨**으로 같이 주문을 도와줘요.

| 프로젝트 | 하는 일 |
| --- | --- |
| **tap-together-app** (여기) | 키오스크 화면 |
| **tap-together-web** | 폰 리모컨 |

내 것으로 만들 건 이 **두 개**예요. (서버는 이미 켜져 있어서 신경 안 써도 돼요.)

---

## 1. 내 사이트 만들기

두 프로젝트 **모두** 똑같이 해요. 프로젝트 이름은 바꾸지 마세요.

1. 오른쪽 위 **Fork** → **Create fork**
2. **Actions** 탭 → 초록 버튼 누르기
3. **Settings → Pages → Source** 를 **GitHub Actions** 로 바꾸기
4. **Actions → Deploy to GitHub Pages → Run workflow** 를 누르고 1~2분 기다리기. 초록 체크(✓)가 뜨면 끝!

내 사이트 주소예요. (`내아이디` = 내 GitHub 아이디)

- 키오스크: `https://내아이디.github.io/tap-together-app/`
- 리모컨: `https://내아이디.github.io/tap-together-web/`

**써 보기**: 컴퓨터로 키오스크 주소를 열면 숫자 6개와 QR이 보여요. 폰으로 QR을 찍으면 리모컨이 열려요. (처음엔 1분쯤 걸릴 수 있어요.)

---

## 2. 메뉴 바꾸기 (ChatGPT에게 말만 하면 돼요)

ChatGPT의 **Codex** 가 내 GitHub에 들어가서 직접 메뉴를 고쳐 줘요. (무료 ChatGPT도 연결돼요. 단, 하루에 쓸 수 있는 양이 정해져 있어요.) 이 프로젝트에는 `AGENTS.md` 라는 안내문이 들어 있어서, Codex가 프로젝트를 이미 알고 시작해요. 따로 가르칠 필요가 없어요!

**처음 한 번 (연결하기)**
1. chatgpt.com 에 로그인하고 왼쪽 메뉴에서 **Codex** 를 열어요.
2. **GitHub 연결**을 눌러요. GitHub 화면이 열리면 **ChatGPT Codex Connector** 를 허용(Install / Authorize)해요.
3. 접근할 프로젝트를 고르는 칸에서 **tap-together-app** 과 **tap-together-web** 두 개를 골라요. (모든 프로젝트를 고르지 마세요.)
4. Codex로 돌아와서 내 **tap-together-app** 을 선택해요.

**메뉴 바꿀 때마다**
1. Codex에 말해요. 예:
   - `아메리카노를 "초코빙수"로 바꿔 줘. 5000원, 이모지는 🍧`
   - `딸기라떼 가격을 5000원으로 올려 줘`
   - `새 메뉴 "망고주스"를 에이드에 만들어 줘. 4500원, 🥭`
2. 다 하면 **Create PR**(바꾼 걸 올리기)을 눌러요. GitHub 화면이 열리면 초록 **Merge pull request** → **Confirm merge** (합치기).
3. **tap-together-web** 을 선택하고 **똑같은 말**을 또 해요. 똑같이 Merge 해요.
4. 1~2분 뒤 사이트에서 **Ctrl + F5**. 바뀌었어요!

**사진은 Codex가 못 올려요.** 사진 바꾸는 법은 [메뉴 직접 고치기](docs/menu-by-hand.md) 를 보세요.

> 비밀번호나 개인 정보는 ChatGPT에 말하지 마세요.

### 연결이 안 되거나 사용량이 끝났다면 (대신 쓰는 방법)

일반 ChatGPT 대화에서도 돼요. [`CHATGPT_PROMPT.md`](CHATGPT_PROMPT.md) 의 글을 새 대화에 붙여넣고 메뉴를 말하면, 코드 상자에 "바꾸는 글" 한 줄이 나와요. 그 줄을 GitHub의 **Actions → Edit menu (ChatGPT helper) → Run workflow** 칸에 붙여넣으면 똑같이 바뀌어요. (app 과 web 두 곳 모두.)

---

## 3. 안 될 때

| 이럴 때 | 이렇게 해 보세요 |
| --- | --- |
| 고쳤는데 그대로예요 | 1~2분 기다리고, Actions에 초록 ✓ 가 뜬 다음 **Ctrl + F5** |
| Actions에 빨간 ✗ 가 떠요 | 눌러서 나온 빨간 글을 ChatGPT에게 붙여넣고 물어보세요 (따옴표가 굽어 있거나 id가 틀린 경우가 많아요) |
| Edit menu 버튼이 안 보여요 | 내 프로젝트에서 **Sync fork → Update branch** 를 하고, Actions가 켜져 있는지 확인 |
| 키오스크만 바뀌고 리모컨은 안 바뀌어요 | 직접 고쳤다면 tap-together-web 도 똑같이 고쳤는지 확인 |
| 리모컨이 연결이 안 돼요 | 1분 뒤에 다시 해 보세요 |
| 사이트가 "404"예요 | Settings → Pages 의 Source 가 **GitHub Actions** 인지, 프로젝트 이름을 안 바꿨는지 확인 |
