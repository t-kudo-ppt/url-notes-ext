// src/background/background.ts

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

// ★ 明示トグル：アイコン（＝_execute_action）で必ず同じロジック
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;
  const tabId = tab.id;

  const enabled = await isPanelEnabled(tabId);
  if (enabled) {
    // 閉じる
    try {
      await chrome.sidePanel.setOptions({ tabId, enabled: false });
    } catch {}
    await setPanelEnabled(tabId, false);
    return;
  }

  // 開く（ユーザージェスチャー直後なので open を“先に・awaitせず”呼ぶ）
  chrome.sidePanel.open({ tabId }).catch(console.error);
  try {
    await chrome.sidePanel.setOptions({
      tabId,
      path: "sidepanel.html",
      enabled: true,
    });
  } catch (e) {
    console.warn("setOptions(enable) failed:", e);
  }
  await setPanelEnabled(tabId, true);
});

// タブが閉じたら掃除
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const k = TAB_STATE_PREFIX + tabId;
  await chrome.storage.session.remove(k);
});
