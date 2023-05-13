import { windows } from 'webextension-polyfill'

const sleep = (duration = 1000) =>
  new Promise((resolve) => {
    setTimeout(resolve, duration)
  })

export const NotificationPage = ({ connectHandler }: { connectHandler: () => Promise<void> }) => {
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    ;(async () => {
      if (!loading) {
        setLoading(true)
        try {
          await sleep(700)
          await connectHandler()
          setLoading(false)
        } catch (error) {
          setLoading(false)
        } finally {
          await sleep(700)
          const { id } = await windows.getCurrent()
          id && windows.remove(id)
        }
      }
    })()
  }, [connectHandler, loading])

  return (
    <div className="flex flex-col items-center pt-20">
      <img src="/assets/active_icon_512.png" alt="" className="w-16 h-16" />
      <span className="mt-5 flex items-center justify-center gap-1 text-sm font-pixel">
        {loading && <span className="w-5 h-5 i-eos-icons:loading text-red-400"></span>}
        <span>{loading ? 'Connecting' : 'Connected'}</span>
      </span>
    </div>
  )
}
