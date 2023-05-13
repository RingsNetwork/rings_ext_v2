import browser from 'webextension-polyfill'

const NOTIFICATION_WIDTH = 358
const NOTIFICATION_HEIGHT = 400

const showNotification = async (query: Record<string, string> = {}, windowInfo: any) => {
  const { screenX, screenY, outerWidth } = windowInfo
  let top = Math.max(screenY, 0)
  let left = Math.max(screenX + (outerWidth - NOTIFICATION_WIDTH), 0)

  await browser.windows.create({
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

  return new Promise((resolve, reject) => {
    // JS GC Error ?
    browser.windows.onRemoved.addListener((id) => {
      resolve(id)
    })
  })
}

export { showNotification }
