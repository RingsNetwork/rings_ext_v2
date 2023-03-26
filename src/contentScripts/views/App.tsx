// import './style.css'

export const App = () => {
  return (
    <div className="fixed right-10 bottom-0 m-5 z-100 flex font-sans select-none leading-1em antialiased">
      <div
        className="absolute right-0 bottom-0 flex-col-center w-10 h-10 rounded-full shadow cursor-pointer bg-green-600 text-sm font-bold text-white"
        onClick={() => {
          console.log('@fisand/hello')
        }}
      >
        R
      </div>
    </div>
  )
}
