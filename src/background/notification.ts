import { sendMessage } from 'webext-bridge/background'
import browser from 'webextension-polyfill'

const NOTIFICATION_WIDTH = 358
const NOTIFICATION_HEIGHT = 400

const showNotification = async (query: Record<string, string> = {}) => {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true })
  const {
    screenX = 0,
    screenY = 0,
    outerWidth = 0,
  } = await sendMessage('getWindowInfo', null, {
    context: 'content-script',
    tabId: tabs?.[0]?.id || 0,
  })

  let top = Math.max(screenY, 0)
  let left = Math.max(screenX + (outerWidth - NOTIFICATION_WIDTH), 0)

  const { id } = await browser.windows.create({
    type: 'popup',
    url: `/dist/popup/index.html?${new URLSearchParams({
      notification: 'true',
      ...query,
    }).toString()}`,
    width: NOTIFICATION_WIDTH,
    height: NOTIFICATION_HEIGHT,
    top,
    left,
  })

  return id
}

async function closeWindow(windowId: number) {
  await browser.windows.remove(windowId)
}

async function handlerNotification(pageType: string, query: Record<string, any>) {
  const windowId = await showNotification({ ...query, pageType })

  return new Promise<void>((resolve, reject) => {
    browser.windows.onRemoved.addListener(function listener(closedWindowId) {
      if (closedWindowId === windowId) {
        browser.windows.onRemoved.removeListener(listener)
        resolve()
      }
    })
  })
}

export { closeWindow, handlerNotification, showNotification }
