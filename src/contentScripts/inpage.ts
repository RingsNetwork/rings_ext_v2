import { createProvider } from '../provider/mitts'

export default (() => {
  window.rings = createProvider()
})()
