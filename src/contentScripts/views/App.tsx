// import './style.css'

export const App = () => {
  return (
    <div className="fixed right-10 bottom-0 m-5 z-100 flex font-sans select-none leading-1em">
      <div
        className="absolute right-0 bottom-0 flex w-10 h-10 rounded-full shadow cursor-pointer bg-green-600"
        onClick={() => {
          console.log('@fisand/hello')
        }}
      />
    </div>
  )
}
