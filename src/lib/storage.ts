import type { Scope } from "./urlKey";

export type Note = {
  key: string;
  urlSample: string;
  scope: Scope;
  title?: string;
  content: string;
  updatedAt: number;
};

const PREFIX_BASE = "notes";
const settingsKey = "settings:defaultScope";

function storageKeyFor(scope: Scope, key: string) {
  return `${PREFIX_BASE}:${scope}:${key}`;
}

export async function getNote(scope: Scope, key: string) {
  const k = storageKeyFor(scope, key);
  const obj = await chrome.storage.local.get(k);
  return (obj[k] as Note | undefined) ?? null;
}

export async function setNote(note: Note) {
  const k = storageKeyFor(note.scope, note.key);
  await chrome.storage.local.set({ [k]: note });
}

/** すべてのメモを取得（MVP: local 全走査） */
export async function getAllNotes(): Promise<Note[]> {
  const obj = await chrome.storage.local.get(null);
  const out: Note[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (!k.startsWith(PREFIX_BASE + ":")) continue;
    const n = v as Note;
    if (!n || typeof n.content !== "string" || typeof n.updatedAt !== "number")
      continue;
    out.push(n);
  }
  return out;
}

/** 指定のメモを削除 */
export async function deleteNote(scope: Scope, key: string): Promise<void> {
  const k = storageKeyFor(scope, key);
  await chrome.storage.local.remove(k);
}

export async function getDefaultScope(): Promise<Scope> {
  const obj = await chrome.storage.local.get(settingsKey);
  const v = obj[settingsKey] as Scope | undefined;
  return v === "exact" || v === "origin" ? v : "path";
}

export async function setDefaultScope(scope: Scope) {
  await chrome.storage.local.set({ [settingsKey]: scope });
}
