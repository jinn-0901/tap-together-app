// ChatGPT 도우미가 보낸 "메뉴 수정 요청(JSON)"을 받아서 src/data/menu.js 를 안전하게 고치는 스크립트.
// AI가 파일 전체를 다시 쓰다가 코드를 깨뜨리지 않도록, 여기서는
//   1) 요청을 엄격하게 검사하고  2) 해당 메뉴 덩어리의 필요한 줄만 바꾸고
//   3) 고친 결과를 실제로 불러와서 검사한 뒤에만  4) 파일에 저장해요.
// 하나라도 이상하면 아무것도 저장하지 않고 실패해요.
//
// 요청 모양 (EDIT_JSON 환경변수):
//   {"action":"update","id":"americano","names":{"ko":"초코빙수","en":"Choco Bingsu"},"price":5000,"icon":"🍧"}
//   {"action":"add","id":"bingsu","category":"ade","price":5000,"icon":"🍧","names":{"ko":"빙수","en":"Bingsu",...}}
//   {"action":"remove","id":"bingsu"}

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const MENU_FILE = process.env.MENU_FILE || "src/data/menu.js";
const LANGS = ["ko", "en", "zh", "ja", "vi"];
const CATEGORIES = ["coffee", "latte", "tea", "ade"];
const FIELD_KEYS = ["id", "category", "price", "icon", "photo", "names", "whip", "iceOnly"];

const fail = (message) => {
  console.error(`::error::${message}`);
  process.exit(1);
};

// ---------- 1. 요청 읽기와 검사 ----------
let edit;
try {
  edit = JSON.parse(process.env.EDIT_JSON || "");
} catch {
  fail("요청이 JSON 모양이 아니에요.");
}
if (typeof edit !== "object" || edit === null || Array.isArray(edit)) fail("요청은 { } 모양이어야 해요.");

const action = edit.action;
if (!["update", "add", "remove"].includes(action)) fail('action 은 "update", "add", "remove" 중 하나여야 해요.');

const allowedKeys = new Set(["action", ...FIELD_KEYS]);
for (const key of Object.keys(edit)) {
  if (!allowedKeys.has(key)) fail(`알 수 없는 항목이에요: ${key}`);
}

const isText = (value, max) =>
  typeof value === "string" && value.trim().length > 0 && value.length <= max && !/[\u0000-\u001f\u007f]/.test(value);

if (typeof edit.id !== "string" || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(edit.id) || edit.id.length > 40) {
  fail("id 는 영어 소문자, 숫자, 하이픈(-)만 쓸 수 있어요. (예: choco-bingsu)");
}
if (edit.category !== undefined && !CATEGORIES.includes(edit.category)) {
  fail(`category 는 ${CATEGORIES.join(", ")} 중 하나여야 해요.`);
}
if (edit.price !== undefined && !(Number.isInteger(edit.price) && edit.price >= 0 && edit.price <= 1000000)) {
  fail("price 는 0 이상의 정수(숫자)여야 해요.");
}
if (edit.icon !== undefined && !isText(edit.icon, 16)) fail("icon 은 이모지 한 개 정도의 짧은 글자여야 해요.");
if (edit.icon !== undefined && /["\\`$<>{}]/.test(edit.icon)) fail("icon 에 쓸 수 없는 글자가 있어요.");
if (edit.photo !== undefined && !/^[A-Za-z0-9][A-Za-z0-9._-]{0,60}\.(jpg|jpeg|png|webp)$/i.test(edit.photo)) {
  fail("photo 는 영어/숫자 파일 이름이고 .jpg .jpeg .png .webp 로 끝나야 해요.");
}
for (const flag of ["whip", "iceOnly"]) {
  if (edit[flag] !== undefined && typeof edit[flag] !== "boolean") fail(`${flag} 는 true 또는 false 여야 해요.`);
}
if (edit.names !== undefined) {
  if (typeof edit.names !== "object" || edit.names === null || Array.isArray(edit.names)) fail("names 는 { } 모양이어야 해요.");
  for (const [lang, value] of Object.entries(edit.names)) {
    if (!LANGS.includes(lang)) fail(`names 에는 ${LANGS.join(", ")} 만 쓸 수 있어요.`);
    if (!isText(value, 60) || /[{}\\`$<>]/.test(value)) fail(`${lang} 이름이 비었거나 너무 길거나 쓸 수 없는 글자가 있어요.`);
  }
}
if (action === "add") {
  for (const key of ["category", "price", "icon", "names"]) {
    if (edit[key] === undefined) fail(`새 메뉴에는 ${key} 가 꼭 필요해요.`);
  }
  if (typeof edit.names.ko !== "string") fail("새 메뉴에는 한국어(ko) 이름이 꼭 필요해요.");
}
if (action === "remove") {
  const extra = Object.keys(edit).filter((k) => !["action", "id"].includes(k));
  if (extra.length > 0) fail("remove 에는 id 만 필요해요.");
}
if (action === "update" && Object.keys(edit).filter((k) => !["action", "id"].includes(k)).length === 0) {
  fail("바꿀 항목이 하나도 없어요.");
}

// ---------- 2. menu.js 에서 메뉴판 부분 찾기 ----------
const original = fs.readFileSync(MENU_FILE, "utf8");
const START = "export const MENU = [\n";
const startIdx = original.indexOf(START);
if (startIdx < 0) fail("menu.js 에서 메뉴판(export const MENU = [)을 못 찾았어요.");
const bodyStart = startIdx + START.length;
const endIdx = original.indexOf("\n];", bodyStart);
if (endIdx < 0) fail("menu.js 에서 메뉴판의 끝(];)을 못 찾았어요.");
const body = original.slice(bodyStart, endIdx + 1);

const blocks = [...body.matchAll(/  \{\n[\s\S]*?\n  \},\n/g)].map((m) => ({ text: m[0], index: m.index }));
const blockId = (text) => (text.match(/^    id: "([^"]+)",/m) || [])[1];
const findBlock = (id) => blocks.find((b) => blockId(b.text) === id);

// ---------- 3. 줄 단위로 값 바꾸기 ----------
const SCALAR = String.raw`(?:"(?:[^"\\\n]|\\.)*"|[\w.-]+)`;

const replaceLine = (block, key, newValueText) => {
  const re = new RegExp(`^(\\s*${key}:\\s*)${SCALAR}(,)([ \\t]*\\/\\/[^\\n]*)?$`, "m");
  if (!re.test(block)) fail(`${blockId(block)} 메뉴에서 ${key} 줄을 못 찾았어요. (줄 모양이 달라졌을 수 있어요)`);
  return block.replace(re, (_m, head, comma, comment) => `${head}${newValueText}${comma}${comment || ""}`);
};

const readNames = (block) => {
  const line = (block.match(/^\s*names:\s*\{[^\n]*\},[^\n]*$/m) || [])[0];
  if (!line) fail(`${blockId(block)} 메뉴에서 names 줄을 못 찾았어요.`);
  const names = {};
  for (const m of line.matchAll(/(\w+):\s*("(?:[^"\\]|\\.)*")/g)) names[m[1]] = JSON.parse(m[2]);
  return names;
};

const namesText = (names) =>
  `{ ${LANGS.filter((l) => names[l] !== undefined).map((l) => `${l}: ${JSON.stringify(names[l])}`).join(", ")} }`;

const replaceNames = (block, names) => {
  const re = /^(\s*names:\s*)\{[^\n]*?\},([ \t]*\/\/[^\n]*)?$/m;
  if (!re.test(block)) fail(`${blockId(block)} 메뉴에서 names 줄을 못 찾았어요.`);
  return block.replace(re, (_m, head, comment) => `${head}${namesText(names)},${comment || ""}`);
};

// ---------- 4. 요청 적용 ----------
let newBody = body;
const target = findBlock(edit.id);

if (action === "update") {
  if (!target) fail(`id 가 "${edit.id}" 인 메뉴가 없어요.`);
  let block = target.text;
  if (edit.category !== undefined) block = replaceLine(block, "category", JSON.stringify(edit.category));
  if (edit.price !== undefined) block = replaceLine(block, "price", String(edit.price));
  if (edit.icon !== undefined) block = replaceLine(block, "icon", JSON.stringify(edit.icon));
  if (edit.photo !== undefined) block = replaceLine(block, "photo", JSON.stringify(edit.photo));
  if (edit.whip !== undefined) block = replaceLine(block, "whip", String(edit.whip));
  if (edit.iceOnly !== undefined) block = replaceLine(block, "iceOnly", String(edit.iceOnly));
  if (edit.names !== undefined) block = replaceNames(block, { ...readNames(block), ...edit.names });
  newBody = body.slice(0, target.index) + block + body.slice(target.index + target.text.length);
} else if (action === "add") {
  if (target) fail(`id 가 "${edit.id}" 인 메뉴가 이미 있어요. 다른 id 를 쓰세요.`);
  const lines = [
    "  {",
    `    id: ${JSON.stringify(edit.id)},`,
    `    category: ${JSON.stringify(edit.category)},`,
    `    price: ${edit.price},`,
    `    icon: ${JSON.stringify(edit.icon)},`,
    `    photo: ${JSON.stringify(edit.photo ?? `${edit.id}.jpg`)},`,
    `    names: ${namesText(edit.names)},`,
    `    whip: ${edit.whip ?? false},`,
    `    iceOnly: ${edit.iceOnly ?? false},`,
    "  },",
    "",
  ];
  newBody = body + lines.join("\n");
} else {
  if (!target) fail(`id 가 "${edit.id}" 인 메뉴가 없어요.`);
  if (blocks.length <= 1) fail("마지막 메뉴 하나는 지울 수 없어요.");
  newBody = body.slice(0, target.index) + body.slice(target.index + target.text.length);
}

const updated = original.slice(0, bodyStart) + newBody + original.slice(endIdx + 1);

// ---------- 5. 고친 결과를 실제로 불러와서 검사 ----------
const tmpFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "menu-check-")), "menu.mjs");
fs.writeFileSync(tmpFile, updated);
let mod;
try {
  mod = await import(pathToFileURL(tmpFile).href);
} catch (error) {
  fail(`고친 menu.js 가 코드로 읽히지 않아서 저장하지 않았어요: ${error.message}`);
}

const menu = mod.MENU;
if (!Array.isArray(menu) || menu.length === 0) fail("고친 결과에 메뉴가 없어서 저장하지 않았어요.");
const seen = new Set();
for (const item of menu) {
  const label = item && item.id;
  if (typeof item.id !== "string" || seen.has(item.id)) fail(`id 가 비었거나 겹쳐요: ${label}`);
  seen.add(item.id);
  if (!mod.CATEGORIES.includes(item.category)) fail(`${label}: category 가 이상해요.`);
  if (!Number.isInteger(item.price) || item.price < 0) fail(`${label}: price 가 이상해요.`);
  if (typeof item.icon !== "string" || !item.icon) fail(`${label}: icon 이 비었어요.`);
  if (typeof item.photo !== "string" || !item.photo) fail(`${label}: photo 가 비었어요.`);
  if (!item.names || typeof item.names.ko !== "string" || !item.names.ko) fail(`${label}: 한국어 이름이 없어요.`);
  if (typeof item.whip !== "boolean" || typeof item.iceOnly !== "boolean") fail(`${label}: whip/iceOnly 가 이상해요.`);
}
if (typeof mod.applyMenuNames !== "function") fail("applyMenuNames 가 사라져서 저장하지 않았어요.");

const after = menu.find((m) => m.id === edit.id);
if (action === "remove") {
  if (after) fail("지우기가 반영되지 않아서 저장하지 않았어요.");
} else {
  if (!after) fail("고친 결과에서 해당 메뉴를 못 찾아서 저장하지 않았어요.");
  for (const key of FIELD_KEYS.filter((k) => k !== "names" && edit[k] !== undefined)) {
    if (after[key] !== edit[key]) fail(`${key} 값이 요청대로 반영되지 않아서 저장하지 않았어요.`);
  }
  for (const [lang, value] of Object.entries(edit.names || {})) {
    if (after.names[lang] !== value) fail(`${lang} 이름이 요청대로 반영되지 않아서 저장하지 않았어요.`);
  }
}

// ---------- 6. 저장 ----------
fs.writeFileSync(MENU_FILE, updated);
const summary = `${action} ${edit.id}: ${JSON.stringify(action === "remove" ? {} : after)}`;
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### 메뉴 수정 결과\n\n\`${summary}\`\n`);
