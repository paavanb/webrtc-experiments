import * as React from 'react'
import {HashRouter} from 'react-router-dom'
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

const rootCss = css`
  height: 100vh;
`

/** Renders the entire application. */
export default function App(): JSX.Element {
  return (
    <div css={rootCss}>
      <CssBaseline />
      <ErrorBoundary>
        {/* HashRouter over BrowserRouter since non-hash routes won't work on GH Pages since the server */}
        {/* won't know which paths to route back to the main app. */}
        <HashRouter basename={process.env.BASE_PATH}>
          <Global styles={globalCss} />
          <AppRouter />
        </HashRouter>
      </ErrorBoundary>
    </div>
  )
}
