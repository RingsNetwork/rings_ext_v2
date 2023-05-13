import { storage } from 'webextension-polyfill'

export const saveStorage = async (key: string, value: any) => {
  await storage.sync.set({
    [key]: value,
  })
}

export const getStorage = async (key: string) => {
  const result = await storage.sync.get(key)

  return result[key]
}
