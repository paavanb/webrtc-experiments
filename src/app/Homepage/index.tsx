import * as React from 'react'
import {css} from '@emotion/core'

const wrapperCss = css({
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
})

const mainCss = css({
  flex: 'auto',
  minHeight: 0,
})

export default function Homepage(): JSX.Element {
  return (
    <div css={wrapperCss}>
      <main css={mainCss}>Hello, world!</main>
    </div>
  )
}
