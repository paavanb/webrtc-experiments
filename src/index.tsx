import 'core-js/stable'
import 'whatwg-fetch'
import * as React from 'react'
import {render} from 'react-dom'

import App from './app/App'

const rootElement = document.createElement('div')
document.body.appendChild(rootElement)
render(<App />, rootElement)

if (process.env.NODE_ENV === 'development' && module.hot) {
  module.hot.accept('./app/App', () => render(<App />, rootElement))
}
