import browser from 'webextension-polyfill'

const NOTIFICATION_WIDTH = 358
const NOTIFICATION_HEIGHT = 400

const showNotification = async (query: Record<string, string> = {}, windowInfo: any) => {
  console.log(query)
  const { screenX, screenY, outerWidth } = windowInfo
  let top = Math.max(screenY, 0)
  let left = Math.max(screenX + (outerWidth - NOTIFICATION_WIDTH), 0)

  browser.windows.create({
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
}

export { showNotification }
