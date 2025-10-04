/**
 * サイドパネルの「安定トグル」実装。
 * - 開く: ユーザー操作直後（アイコン/_execute_action）に open() を先にfire → setOptions()
 * - 閉じる: setOptions({ enabled:false })
 * - タブごとの開閉状態は chrome.storage.session に保持
 */
const TAB_STATE_PREFIX = "sidepanel:enabled:";

async function isPanelEnabled(tabId: number): Promise<boolean> {
  const k = TAB_STATE_PREFIX + tabId;
  const obj = await chrome.storage.session.get(k);
  return obj[k] === true;
}
async function setPanelEnabled(tabId: number, val: boolean) {
  const k = TAB_STATE_PREFIX + tabId;
  await chrome.storage.session.set({ [k]: val });
}

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;
  const tabId = tab.id;
  const enabled = await isPanelEnabled(tabId);
  if (enabled) {
    try {
      await chrome.sidePanel.setOptions({ tabId, enabled: false });
    } catch {}
    await setPanelEnabled(tabId, false);
    return;
  }
  // 開く: openを先に（awaitしない）→ 直後にsetOptions
  chrome.sidePanel.open({ tabId }).catch(console.error);
  try {
    await chrome.sidePanel.setOptions({
      tabId,
      path: "sidepanel.html",
      enabled: true,
    });
  } catch {}
  await setPanelEnabled(tabId, true);
});

// タブが閉じたら状態クリア
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const k = TAB_STATE_PREFIX + tabId;
  await chrome.storage.session.remove(k);
});
