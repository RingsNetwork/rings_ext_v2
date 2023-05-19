import { windows } from 'webextension-polyfill'

import { sleep } from '~/utils'

export const NotificationPage = ({
  connectHandler,
  loading,
}: {
  connectHandler: () => Promise<void>
  loading: boolean
}) => {
  const queries = useMemo(() => new URLSearchParams(location.search), [])

  const [pageStatus, setPageStatus] = useState<'init' | 'pending' | 'error' | 'success'>('init')

  useEffect(() => {
    queries.get('pageType') === 'connect' &&
      (async () => {
        if (!loading) {
          try {
            await sleep(200)
            setPageStatus('pending')
            await connectHandler()
            setPageStatus('success')
          } catch (error) {
            setPageStatus('error')
          } finally {
            await sleep(500)
            const { id } = await windows.getCurrent()
            id && (await windows.remove(id))
          }
        }
      })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return queries.get('pageType') === 'connect' ? (
    <div className="flex flex-col items-center pt-20 antialiased">
      <img src="/assets/active_icon_512.png" alt="" className="w-16 h-16" />
      <span className="mt-5 flex items-center justify-center gap-1 text-sm font-pixel">
        {pageStatus === 'pending' && <span className="w-5 h-5 i-eos-icons:loading text-red-400"></span>}
        <span>
          {pageStatus === 'init'
            ? 'Initialization'
            : pageStatus === 'error'
            ? 'Error'
            : pageStatus === 'success'
            ? 'Connected'
            : ''}
        </span>
      </span>
    </div>
  ) : (
    <div className="font-pixel antialiased">
      <div className="relative p-2.5 flex gap-1 items-center border-solid border-b border-gray-300">
        <img src="/assets/active_icon_512.png" alt="" className="w-6 h-6" />
        <span className="relative -bottom-.5">Set urls</span>
      </div>
      <div className="relative p-2.5">
        <div className="flex justify-between items-center">
          <span className="w-80px text-xs origin-left">TurnUrl:</span>
          <input
            className="h-7 px-1 flex-1 fake-border outline-none origin-right disabled:opacity-60"
            value={queries.get('turnUrl') ?? ''}
            disabled
          />
        </div>
        <div className="mt-2.5 flex justify-between items-center">
          <span className="w-80px text-xs origin-left">NodeUrl:</span>
          <input
            className="h-7 px-1 flex-1 fake-border outline-none origin-right disabled:opacity-60"
            value={queries.get('nodeUrl') ?? ''}
            disabled
          />
        </div>
      </div>

      <div className="p-2.5 flex justify-end border-solid border-t border-gray-300">
        <button className="relative px-2.5 py-1.5 border-angle fake-border hover:bg-stone/5 active:bg-stone/10 text-xs font-light">
          Confirm
        </button>
      </div>
    </div>
  )
}
