import * as React from 'react'
import {BrowserRouter} from 'react-router-dom'
import {Global, css} from '@emotion/core'
import {CssBaseline} from '@material-ui/core'

import ErrorBoundary from './ErrorBoundary'
import AppRouter from './AppRouter'

const globalCss = css({
  '*, *::after, *::before': {
    boxSizing: 'border-box',
  },
  a: {
    textDecoration: 'none',
    color: 'inherit',
  },
  body: {
    // Prevent actions like double-tap-to-zoom
    touchAction: 'manipulation',
  },
})

/** Renders the entire application. */
export default function App(): JSX.Element {
  return (
    <>
      <CssBaseline />
      <ErrorBoundary>
        <BrowserRouter>
          <Global styles={globalCss} />
          <AppRouter />
        </BrowserRouter>
      </ErrorBoundary>
    </>
  )
}
