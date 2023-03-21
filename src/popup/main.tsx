import ready from 'document-ready'
import { createRoot } from 'react-dom/client'

import { Popup } from './Popup'

import '@unocss/reset/tailwind.css'
import 'uno.css'

ready(() => {
  const root = createRoot(document.getElementById('root')!)

  root.render(<Popup />)
})
