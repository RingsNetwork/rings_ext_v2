import { sendMessage } from 'webext-bridge/background'
import browser from 'webextension-polyfill'

async function createEvent(
  name:
    | 'changeName'
    | 'activeChat'
    | 'endChat'
    | 'receiveMessage'
    | 'initSuccess'
    | 'initFailed'
    | 'connectedServiceNode'
    | 'connecting'
    | 'connected'
    | 'disconnected',
  args?: Record<string, any>
) {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true })
  sendMessage(
    'event',
    {
      name,
      data: args,
    },
    {
      context: 'content-script',
      tabId: tabs[0].id!,
    }
  )
}

export const changeName = (args?: Record<string, any>) => createEvent('changeName', args)

export const activeChat = (args?: Record<string, any>) => createEvent('activeChat', args)

export const endChat = (args?: Record<string, any>) => createEvent('endChat', args)

export const receiveMessage = (args?: Record<string, any>) => createEvent('receiveMessage', args)

export const initSuccess = (args?: Record<string, any>) => createEvent('initSuccess', args)

export const initFailed = (args?: Record<string, any>) => createEvent('initFailed', args)

export const connectedServiceNode = (args?: Record<string, any>) => createEvent('connectedServiceNode', args)

export const connecting = (args?: Record<string, any>) => createEvent('connecting', args)

export const connected = (args?: Record<string, any>) => createEvent('connected', args)

export const disconnected = (args?: Record<string, any>) => createEvent('disconnected', args)
