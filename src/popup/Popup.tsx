import './style.css'

export function Popup() {
  const [count, setCount] = useState(0)

  return (
    <div className="container">
      <header className="App-header">
        <img
          src="https://api.iconify.design/logos:appbaseio-icon.svg?color=%23888888"
          className="App-logo"
          alt="logo"
        />
        <p>Hello Vite + React!</p>
        <p>
          <button
            type="button"
            onClick={() => setCount((count) => count + 1)}
            className="px-2 py-4 rounded bg-fuchsia-200"
          >
            count is: {count}
          </button>
        </p>
        <p>
          Edit <code>App.tsx</code> and save to test HMR updates.
        </p>
        <p>
          <a className="App-link" href="https://reactjs.org" target="_blank" rel="noopener noreferrer">
            Learn React
          </a>
          {' | '}
          <a
            className="App-link"
            href="https://vitejs.dev/guide/features.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            Vite Docs
          </a>
        </p>
      </header>
    </div>
  )
}
