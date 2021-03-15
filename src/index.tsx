import 'core-js/stable'
import 'whatwg-fetch'
import * as React from 'react'
import {render} from 'react-dom'

import App from './app/App'

const bodyEl = document.body
render(<App />, bodyEl)
if (process.env.NODE_ENV === 'development' && module.hot) {
  module.hot.accept('./app/App', () => render(<App />, bodyEl))
}
