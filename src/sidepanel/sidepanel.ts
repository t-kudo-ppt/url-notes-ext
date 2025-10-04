import { debounce } from "../lib/debounce";
import { buildKey, type Scope } from "../lib/urlKey";
import {
  getNote,
  setNote,
  getDefaultScope,
  setDefaultScope,
  getAllNotes,
  deleteNote,
  type Note,
} from "../lib/storage";

// ---- DOM ----
const editor = document.getElementById("editor") as HTMLTextAreaElement;
const statusEl = document.getElementById("status") as HTMLDivElement;
const pageTitleEl = document.getElementById("pageTitle") as HTMLDivElement;
const scopeSel = document.getElementById("scopeSelect") as HTMLSelectElement;

const tabEdit = document.getElementById("tab-edit") as HTMLButtonElement;
const tabList = document.getElementById("tab-list") as HTMLButtonElement;
const viewEdit = document.getElementById("view-edit") as HTMLElement;
const viewList = document.getElementById("view-list") as HTMLElement;
const searchInput = document.getElementById("searchInput") as HTMLInputElement;
const clearBtn = document.getElementById("clearBtn") as HTMLButtonElement;
const listContainer = document.getElementById(
  "listContainer"
) as HTMLDivElement;
const exportBtn = document.getElementById("exportBtn") as HTMLButtonElement;
const importFile = document.getElementById("importFile") as HTMLInputElement;

// ---- State ----
let currentKey = "";
let currentScope: Scope = "path";
let currentUrlSample = "";
let loading = true;
let allNotesCache: Note[] = [];

// ---- Utils ----
function setStatus(text: string) {
  statusEl.textContent = text;
}
function hostFromUrl(u: string): string {
  try {
    return new URL(u).host;
  } catch {
    return u;
  }
}
function fmtTime(ts: number): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

/** 現在のウィンドウでアクティブなタブを返す */
async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

/** アクティブタブのURLに対するメモを読み込んでエディタへ反映 */
async function loadNoteForActiveTab(scope: Scope) {
  setStatus("Loading…");
  const tab = await getActiveTab();
  const url = tab?.url ?? "";
  currentUrlSample = url;
  pageTitleEl.textContent = tab?.title ?? "Untitled";
  const { key } = buildKey(url, scope);
  currentKey = key;
  const existing = await getNote(scope, key);
  editor.value = existing ? existing.content : "";
  setStatus(existing ? "Loaded" : "New");
  loading = false;
}

/** 入力内容を保存（空なら削除） */
const persist = debounce(async () => {
  if (!currentKey) return;
  const text = editor.value;
  const trimmed = text.trim();
  if (trimmed === "") {
    const existed = await getNote(currentScope, currentKey);
    if (existed) {
      await deleteNote(currentScope, currentKey);
      allNotesCache = allNotesCache.filter(
        (n) => !(n.scope === currentScope && n.key === currentKey)
      );
      await refreshList(searchInput?.value?.trim() ?? "");
      setStatus("Cleared");
    } else {
      setStatus("Empty");
    }
    return;
  }
  setStatus("Saving…");
  const note: Note = {
    key: currentKey,
    urlSample: currentUrlSample,
    scope: currentScope,
    title: pageTitleEl.textContent ?? undefined,
    content: text,
    updatedAt: Date.now(),
  };
  await setNote(note);
  const idx = allNotesCache.findIndex(
    (n) => n.scope === currentScope && n.key === currentKey
  );
  if (idx >= 0) allNotesCache[idx] = note;
  else allNotesCache.push(note);
  setStatus("Saved");
}, 500);

function onInput() {
  if (!loading) persist();
}

/** スコープ変更時はキーを再計算してロード */
async function onScopeChange() {
  const val = scopeSel.value as Scope;
  currentScope = val === "exact" || val === "origin" ? val : "path";
  await setDefaultScope(currentScope);
  loading = true;
  await loadNoteForActiveTab(currentScope);
}

// ---- 検索/最近 ----
function matches(note: Note, q: string): boolean {
  if (!q) return true;
  const s = q.toLowerCase();
  return (
    (note.title ?? "").toLowerCase().includes(s) ||
    note.content.toLowerCase().includes(s) ||
    note.urlSample.toLowerCase().includes(s) ||
    note.key.toLowerCase().includes(s)
  );
}

function renderList(notes: Note[]) {
  if (notes.length === 0) {
    listContainer.innerHTML =
      '<div class="item" aria-live="polite">メモがありません</div>';
    return;
  }
  const html = notes
    .map((n) => {
      const t = (n.title && n.title.trim()) || hostFromUrl(n.urlSample);
      const firstLine = (n.content.split("\n")[0] || "").replace(/</g, "&lt;");
      const excerpt = firstLine
        ? `${firstLine} — <span class="meta">${n.urlSample}</span>`
        : `<span class="meta">${n.urlSample}</span>`;
      return `
      <div class="item" data-key="${encodeURIComponent(n.key)}" data-scope="${
        n.scope
      }">
        <div class="line1">
          <div class="title">${t}</div>
          <span class="pill">${n.scope}</span>
          <span class="meta">${fmtTime(n.updatedAt)}</span>
          <button class="delbtn" data-del="1">削除</button>
        </div>
        <div class="excerpt">${excerpt}</div>
      </div>`;
    })
    .join("");
  listContainer.innerHTML = html;
}

async function refreshList(q = "") {
  if (allNotesCache.length === 0) allNotesCache = await getAllNotes();
  const filtered = allNotesCache
    .filter((n) => n.content && n.content.trim() !== "")
    .filter((n) => matches(n, q))
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 200);
  renderList(filtered);
}

const onSearchInput = debounce(() => {
  void refreshList(searchInput.value.trim());
}, 150);

listContainer.addEventListener("click", async (ev) => {
  const target = ev.target as HTMLElement;
  const item = target.closest(".item") as HTMLElement | null;
  if (!item) return;

  if (target instanceof HTMLButtonElement && target.dataset.del === "1") {
    const scope = item.getAttribute("data-scope") as Scope;
    const key = decodeURIComponent(item.getAttribute("data-key") || "");
    if (scope && key && confirm("このメモを削除しますか？")) {
      await deleteNote(scope, key);
      allNotesCache = allNotesCache.filter(
        (n) => !(n.scope === scope && n.key === key)
      );
      await refreshList(searchInput.value.trim());
    }
    return;
  }

  const scope = item.getAttribute("data-scope") as Scope;
  const key = decodeURIComponent(item.getAttribute("data-key") || "");
  const note = allNotesCache.find((n) => n.scope === scope && n.key === key);
  if (!note) return;

  currentScope = scope;
  scopeSel.value = scope;
  currentKey = key;
  currentUrlSample = note.urlSample;
  pageTitleEl.textContent = note.title ?? hostFromUrl(note.urlSample);
  editor.value = note.content;
  setStatus("Loaded");
  selectTab("edit");
});

clearBtn.addEventListener("click", () => {
  searchInput.value = "";
  void refreshList("");
  searchInput.focus();
});
searchInput.addEventListener("input", onSearchInput);

// ---- Export / Import ----
type ExportBundle = { version: 1; exportedAt: number; notes: Note[] };

function downloadJson(filename: string, data: object) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function handleExport() {
  setStatus("Exporting…");
  const notes = await getAllNotes();
  const bundle: ExportBundle = { version: 1, exportedAt: Date.now(), notes };
  const ts = new Date().toISOString().replace(/[:.-]/g, "").slice(0, 15); // ES2020互換
  downloadJson(`url-notes-backup-${ts}.json`, bundle);
  setStatus("Exported");
}

async function handleImport(file: File) {
  const text = await file.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    alert("JSONのパースに失敗しました");
    return;
  }
  const bundle = data as Partial<ExportBundle>;
  if (!bundle || !Array.isArray(bundle.notes)) {
    alert("不正な形式です (notes が見つかりません)");
    return;
  }
  if (
    !confirm(
      `${bundle.notes.length} 件のメモをインポートします。既存とキー衝突時は上書きします。よろしいですか？`
    )
  )
    return;

  setStatus("Importing…");
  for (const n of bundle.notes) {
    if (!n || typeof n !== "object") continue;
    if (typeof n.key !== "string" || typeof n.scope !== "string") continue;
    if (typeof n.content !== "string" || typeof n.updatedAt !== "number")
      continue;
    await setNote(n as Note);
  }
  allNotesCache = await getAllNotes();
  await refreshList(searchInput.value.trim());
  setStatus("Imported");
}

exportBtn.addEventListener("click", () => {
  void handleExport();
});
importFile.addEventListener("change", async () => {
  const f = importFile.files?.[0];
  if (!f) return;
  try {
    await handleImport(f);
  } finally {
    importFile.value = "";
  }
});

// ---- タブUI ----
function selectTab(which: "edit" | "list") {
  const isEdit = which === "edit";
  tabEdit.setAttribute("aria-selected", String(isEdit));
  tabList.setAttribute("aria-selected", String(!isEdit));
  viewEdit.dataset.active = String(isEdit);
  viewList.dataset.active = String(!isEdit);
}

tabEdit.addEventListener("click", () => selectTab("edit"));
tabList.addEventListener("click", async () => {
  selectTab("list");
  await refreshList(searchInput.value.trim());
});

// ---- タブ/URLの変化に追従 ----
const reloadForTabChange = debounce(async () => {
  loading = true;
  await loadNoteForActiveTab(currentScope);
}, 120);
function wireTabEvents() {
  chrome.tabs.onActivated.addListener(() => reloadForTabChange());
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (!tab.active) return;
    if (changeInfo.status === "complete" || typeof changeInfo.url === "string")
      reloadForTabChange();
  });
  chrome.windows.onFocusChanged.addListener(() => reloadForTabChange());
}

// ---- 起動 ----
async function main() {
  currentScope = await getDefaultScope();
  scopeSel.value = currentScope;
  wireTabEvents();
  await loadNoteForActiveTab(currentScope);
  editor.addEventListener("input", onInput);
  scopeSel.addEventListener("change", () => {
    void onScopeChange();
  });
}

void main();
