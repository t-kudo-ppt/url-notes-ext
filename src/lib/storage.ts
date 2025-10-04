import type { Scope } from "./urlKey";

/** 永続化されるメモの型 */
export type Note = {
  key: string; // 保存キー（buildKeyの結果）
  urlSample: string; // 元URLの一例（UI表示用）
  scope: Scope; // exact | path | origin
  title?: string; // 取得時のタブタイトル
  content: string; // 本文
  updatedAt: number; // epoch ms
};

const PREFIX = "notes";
const SETTINGS_DEFAULT_SCOPE = "settings:defaultScope";

/** ストレージ上の実キーを生成 */
function storageKeyFor(scope: Scope, key: string) {
  return `${PREFIX}:${scope}:${key}`;
}

/** 単一メモを取得 */
export async function getNote(scope: Scope, key: string) {
  const k = storageKeyFor(scope, key);
  const obj = await chrome.storage.local.get(k);
  return (obj[k] as Note | undefined) ?? null;
}

/** 単一メモを保存（上書き含む） */
export async function setNote(note: Note) {
  const k = storageKeyFor(note.scope, note.key);
  await chrome.storage.local.set({ [k]: note });
}

/** 単一メモを削除 */
export async function deleteNote(scope: Scope, key: string) {
  const k = storageKeyFor(scope, key);
  await chrome.storage.local.remove(k);
}

/** 全メモを列挙（MVP: 全キー走査） */
export async function getAllNotes(): Promise<Note[]> {
  const obj = await chrome.storage.local.get(null);
  const out: Note[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (!k.startsWith(PREFIX + ":")) continue;
    const n = v as Note;
    if (!n || typeof n.content !== "string" || typeof n.updatedAt !== "number")
      continue;
    out.push(n);
  }
  return out;
}

/** 既定スコープ */
export async function getDefaultScope(): Promise<Scope> {
  const obj = await chrome.storage.local.get(SETTINGS_DEFAULT_SCOPE);
  const v = obj[SETTINGS_DEFAULT_SCOPE] as Scope | undefined;
  return v === "exact" || v === "origin" ? v : "path";
}
export async function setDefaultScope(scope: Scope) {
  await chrome.storage.local.set({ [SETTINGS_DEFAULT_SCOPE]: scope });
}
