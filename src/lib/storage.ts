import type { Scope } from './urlKey';

/** 保存されるメモの構造 */
export type Note = {
  key: string;
  urlSample: string;
  scope: Scope;
  title?: string;
  content: string;
  updatedAt: number; // epoch ms
};

const PREFIX = 'notes';
const SETTINGS_DEFAULT_SCOPE = 'settings:defaultScope';

function storageKeyFor(scope: Scope, key: string) {
  return `${PREFIX}:${scope}:${key}`;
}

/** 単一メモの取得 */
export async function getNote(scope: Scope, key: string) {
  const k = storageKeyFor(scope, key);
  const obj = await chrome.storage.local.get(k);
  return (obj[k] as Note | undefined) ?? null;
}

/** 単一メモの保存（上書き含む） */
export async function setNote(note: Note) {
  const k = storageKeyFor(note.scope, note.key);
  await chrome.storage.local.set({ [k]: note });
}

/** 単一メモの削除 */
export async function deleteNote(scope: Scope, key: string) {
  const k = storageKeyFor(scope, key);
  await chrome.storage.local.remove(k);
}

/** 全メモの列挙（MVP: 全キー走査） */
export async function getAllNotes(): Promise<Note[]> {
  const obj = await chrome.storage.local.get(null);
  const out: Note[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (!k.startsWith(PREFIX + ':')) continue;
    const n = v as Note;
    if (!n || typeof n.content !== 'string' || typeof n.updatedAt !== 'number') continue;
    out.push(n);
  }
  return out;
}

/** 既定スコープの取得 */
export async function getDefaultScope(): Promise<Scope> {
  const obj = await chrome.storage.local.get(SETTINGS_DEFAULT_SCOPE);
  const v = obj[SETTINGS_DEFAULT_SCOPE] as Scope | undefined;
  return v === 'exact' || v === 'origin' ? v : 'path';
}

/** 既定スコープの保存 */
export async function setDefaultScope(scope: Scope) {
  await chrome.storage.local.set({ [SETTINGS_DEFAULT_SCOPE]: scope });
}
