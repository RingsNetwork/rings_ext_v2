/* eslint-disable no-console */
import { WindowPostMessageStream } from '@metamask/post-message-stream'
// import { createRoot } from 'react-dom/client'
import { onMessage, sendMessage } from 'webext-bridge/content-script'

// import { App } from './views/App'

// import '@unocss/reset/tailwind.css'
// import 'uno.css'

const CONTENT_SCRIPT = 'rings-contentscript'
const INPAGE = 'rings-inpage'

const setupPageStream = () => {
  const pageStream = new WindowPostMessageStream<
    { type: string; payload: any },
    { type: string } & Record<string, any>
  >({
    name: CONTENT_SCRIPT,
    target: INPAGE,
  })

  pageStream.on('data', async (data) => {
    if (data?.type === 'request') {
      const res = await sendMessage('request-handler', data as any)
      pageStream.write({
        type: 'request',
        payload: res,
      })
    }
  })

  onMessage('event', async ({ data }) => {
    if (data?.name) {
      pageStream.write({
        type: 'event',
        payload: data,
      })
    }
  })
}

// init stream
;(() => {
  setupPageStream()
})()

// Firefox `browser.tabs.executeScript()` requires scripts return a primitive value
// eslint-disable-next-line import/newline-after-import
;(() => {
  console.info('[webext-template] Hello world from content script')

  // communication example: send previous tab title from background page
  onMessage('tab-prev', ({ data }) => {
    console.log(`[webext-template] Navigate from page "${data.title}"`)
  })

  // mount component to context window
  const container = document.createElement('div')
  const root = document.createElement('div')
  container.className = 'webext-template'
  // const styleEl = document.createElement('link')
  const scriptEl = document.createElement('script')
  const shadowDOM = container.attachShadow?.({ mode: __DEV__ ? 'open' : 'closed' }) || container

  scriptEl.setAttribute('src', browser.runtime.getURL('dist/contentScripts/inpage.global.js'))
  // styleEl.setAttribute('rel', 'stylesheet')
  // styleEl.setAttribute('href', browser.runtime.getURL('dist/contentScripts/style.css'))

  // shadowDOM.appendChild(styleEl)
  shadowDOM.appendChild(root)
  shadowDOM.appendChild(scriptEl)
  document.body.appendChild(container)
  // const $root = createRoot(root)
  // $root.render(<App />)
  shadowDOM.removeChild(scriptEl)
})()

export default {}
