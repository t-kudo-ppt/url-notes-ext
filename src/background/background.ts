/**
 * サイドパネルの「安定トグル」
 * - 開: user gesture 直後に open() → 続いて setOptions()
 * - 閉: setOptions({ enabled:false })
 * - タブごとの開閉状態は session storage に保持
 */
const TAB_STATE_PREFIX = 'sidepanel:enabled:';

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
    } catch (e) {
      console.warn('disable failed', e);
    }
    await setPanelEnabled(tabId, false);
    return;
  }
  // open は user gesture 直後に先行発火（await しない）
  chrome.sidePanel.open({ tabId }).catch((e) => console.warn('open failed', e));
  try {
    await chrome.sidePanel.setOptions({ tabId, path: 'sidepanel.html', enabled: true });
  } catch (e) {
    console.warn('enable failed', e);
  }
  await setPanelEnabled(tabId, true);
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const k = TAB_STATE_PREFIX + tabId;
  await chrome.storage.session.remove(k);
});
