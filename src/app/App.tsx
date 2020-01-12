import * as React from 'react'
import {BrowserRouter} from 'react-router-dom'
import {Global, css} from '@emotion/core'
import 'normalize.css'

import ErrorBoundary from './ErrorBoundary'
import AppRouter from './AppRouter'

const globalCss = css({
  '*, *::after, *::before': {
    boxSizing: 'border-box',
  },
  html: {
    fontSize: 13,
    lineHeight: 1.2,
    fontFamily: 'Arial, sans-serif',
  },
  a: {
    textDecoration: 'none',
    color: 'inherit',
  },
})

/** Renders the entire application. */
export default function App(): JSX.Element {
  return (
    <React.StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <Global styles={globalCss} />
          <AppRouter />
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>
  )
}
