// ChatGPT 도우미가 보낸 "새 리모컨 기능 요청(JSON)"을 안전하게 반영하는 스크립트예요.
// 앱(키오스크)에서는 src/custom-features.css 를, 웹(리모컨)에서는 src/data/customFeatures.js 를 고쳐요.
// 같은 JSON을 두 곳에서 똑같이 실행하면 돼요. 어느 쪽인지는 파일이 있는지 보고 알아서 정해요.
// 하나라도 이상하면 아무것도 저장하지 않고 실패해요.
//
// 요청 모양 (EDIT_JSON 환경변수):
//   {"action":"add-feature","id":"dark-mode","icon":"🌙","names":{"ko":"어두운 화면","en":"Dark mode"},
//    "css":".fx-dark-mode .kiosk { background: #111; color: #fff; }"}
//   {"action":"remove-feature","id":"dark-mode"}
// css 의 모든 규칙은 ".fx-기능이름" 으로 시작해야 해요. (기능이 켜지면 화면에 그 표시가 붙어요)

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.env.FEATURES_ROOT || process.cwd();
const LANGS = ["ko", "en", "zh", "ja", "vi"];
const BUILT_IN = ["easy-mode", "voice", "large-text", "high-contrast", "voice-guide"];

const fail = (message) => {
  console.error(`::error::${message}`);
  console.error(`실패: ${message}`);
  process.exit(1);
};

let edit;
try {
  edit = JSON.parse(process.env.EDIT_JSON || "");
} catch {
  fail("요청이 올바른 JSON 글자가 아니에요. 따옴표는 곧은 따옴표(\")만 써야 해요.");
}
if (!edit || typeof edit !== "object" || Array.isArray(edit)) fail("요청은 { } 모양이어야 해요.");

const action = edit.action;
if (!["add-feature", "remove-feature"].includes(action)) fail('action 은 "add-feature" 또는 "remove-feature" 여야 해요.');
const allowedKeys = action === "add-feature" ? ["action", "id", "icon", "names", "css"] : ["action", "id"];
for (const key of Object.keys(edit)) if (!allowedKeys.includes(key)) fail(`쓸 수 없는 항목이에요: ${key}`);

const id = edit.id;
if (typeof id !== "string" || !/^[a-z][a-z0-9-]{0,29}$/.test(id)) fail("id 는 영어 소문자로 시작하고, 소문자·숫자·하이픈만, 30자까지 써야 해요. 예: dark-mode");
if (BUILT_IN.includes(id)) fail(`id "${id}" 는 이미 있는 기본 기능 이름이라 쓸 수 없어요.`);

const webFile = path.join(ROOT, "src/data/customFeatures.js");
const appFile = path.join(ROOT, "src/custom-features.css");
const target = fs.existsSync(webFile) ? "web" : fs.existsSync(appFile) ? "app" : null;
if (!target) fail("이 프로젝트에는 새 기능을 넣을 파일이 없어요. (Sync fork 로 최신으로 맞춘 뒤 다시 해 보세요)");
const file = target === "web" ? webFile : appFile;
const START = target === "web" ? "// FEATURES-START" : "/* FEATURES-START */";
const END = target === "web" ? "// FEATURES-END" : "/* FEATURES-END */";

const text = fs.readFileSync(file, "utf8");
const startAt = text.indexOf(START);
const endAt = text.indexOf(END);
if (startAt < 0 || endAt < 0 || endAt < startAt) fail("파일의 FEATURES-START / FEATURES-END 표시가 없어졌어요. 선생님께 알려 주세요.");
const head = text.slice(0, startAt + START.length);
const body = text.slice(startAt + START.length, endAt);
const tail = text.slice(endAt);

const FORBIDDEN_TEXT = /[{}\\`$<>"'\u0000-\u001f]/;

// ── 지우기 ──
const removeEntry = (b) => {
  if (target === "web") {
    const lines = b.split("\n");
    const kept = lines.filter((l) => !l.includes(`"id":"${id}"`));
    return { out: kept.join("\n"), removed: kept.length !== lines.length };
  }
  const re = new RegExp(`\\n?/\\* feature:${id} \\*/[\\s\\S]*?/\\* end:${id} \\*/\\n?`);
  return { out: b.replace(re, "\n"), removed: re.test(b) };
};

let newBody;
if (action === "remove-feature") {
  const { out, removed } = removeEntry(body);
  if (!removed) fail(`"${id}" 라는 기능이 없어요.`);
  newBody = out;
} else {
  const icon = edit.icon;
  if (typeof icon !== "string" || icon.length < 1 || icon.length > 16 || /[{}\\`$<>"'\u0000-\u001f]/.test(icon)) fail("icon 은 이모지 하나(16글자 이하)여야 해요.");
  const names = edit.names;
  if (!names || typeof names !== "object" || Array.isArray(names)) fail("names 가 필요해요.");
  for (const [k, v] of Object.entries(names)) {
    if (!LANGS.includes(k)) fail(`names 에 쓸 수 없는 나라 말이에요: ${k}`);
    if (typeof v !== "string" || v.trim().length < 1 || v.length > 30 || FORBIDDEN_TEXT.test(v)) fail(`names.${k} 는 30자 이하의 평범한 글자여야 해요.`);
  }
  if (!names.ko) fail("names.ko (한국어 이름)가 꼭 필요해요.");

  const css = edit.css;
  if (typeof css !== "string" || css.trim().length < 1 || css.length > 3000) fail("css 는 1~3000자의 글이어야 해요.");
  if (/[\\<]|@|url\s*\(|expression|javascript:|\/\*|\*\/|\u0000/i.test(css)) fail("css 에 쓸 수 없는 글자가 있어요. (@, url(, 주석, 역슬래시, < 는 안 돼요)");
  let depth = 0;
  for (const ch of css) {
    if (ch === "{") depth += 1;
    if (ch === "}") depth -= 1;
    if (depth > 1 || depth < 0) fail("css 의 중괄호 { } 가 맞지 않거나 겹쳐 있어요.");
  }
  if (depth !== 0) fail("css 의 중괄호 { } 가 맞지 않아요.");
  const rules = css.split("}").map((r) => r.trim()).filter(Boolean);
  if (rules.length === 0) fail("css 에 규칙이 없어요.");
  const selectorStart = new RegExp(`^\\.fx-${id}(?![a-z0-9-])`);
  for (const rule of rules) {
    const open = rule.indexOf("{");
    if (open < 1) fail("css 규칙은 '선택자 { 속성: 값; }' 모양이어야 해요.");
    for (const selector of rule.slice(0, open).split(",")) {
      if (!selectorStart.test(selector.trim())) fail(`css 의 모든 선택자는 ".fx-${id}" 로 시작해야 해요. 문제: "${selector.trim()}"`);
    }
  }

  const { out } = removeEntry(body); // 같은 id 가 있으면 새 내용으로 바꿔요
  if (target === "web") {
    const entry = JSON.stringify({ id, icon, names });
    newBody = `${out.replace(/\s+$/, "")}\n  ${entry},\n  `;
  } else {
    newBody = `${out.replace(/\s+$/, "")}\n/* feature:${id} */\n${css.trim()}\n/* end:${id} */\n`;
  }
}
const finalBody = target === "web" ? newBody.replace(/^\n+/, "\n") : newBody;
const result = head + finalBody + tail;

// 웹은 고친 결과를 실제로 불러와서 검사하고, 요청한 내용이 들어갔는지 확인해요
if (target === "web") {
  const tmp = path.join(ROOT, `.tmp-check-${process.pid}.mjs`);
  fs.writeFileSync(tmp, result);
  try {
    const mod = await import(pathToFileURL(tmp).href);
    const list = mod.CUSTOM_FEATURES;
    if (!Array.isArray(list)) fail("고친 결과가 올바르지 않아요.");
    const found = list.find((f) => f.id === id);
    if (action === "add-feature" && (!found || found.icon !== edit.icon)) fail("고친 결과에 새 기능이 제대로 들어가지 않았어요.");
    if (action === "remove-feature" && found) fail("기능이 지워지지 않았어요.");
    if (new Set(list.map((f) => f.id)).size !== list.length) fail("같은 id 가 두 번 들어 있어요.");
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

fs.writeFileSync(file, result);
console.log(`${action} ${id} → ${path.relative(ROOT, file)} 에 저장했어요.`);
