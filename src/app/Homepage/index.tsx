import * as React from 'react'
import {css} from '@emotion/core'
import {Link} from 'react-router-dom'
import createPersistedState from 'use-persisted-state'

const {NODE_ENV} = process.env

const useUsernameState = createPersistedState(
  'username',
  NODE_ENV === 'production' ? localStorage : sessionStorage
)

const wrapperCss = css({
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
})

const mainCss = css({
  flex: 'auto',
  minHeight: 0,
})

function gameLink(username: string, host: boolean): string {
  if (host) return `/g?u=${username}&h`
  return `/g?u=${username}`
}

export default function Homepage(): JSX.Element {
  const [username, setUsername] = useUsernameState('')

  return (
    <div css={wrapperCss}>
      <main css={mainCss}>
        <form>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Username"
          />
        </form>
        <div>
          <Link to={gameLink(username, true)}>
            <button type="button">Host a Game</button>
          </Link>
        </div>
        <div>
          <Link to={gameLink(username, false)}>
            <button type="button">Join a Game</button>
          </Link>
        </div>
      </main>
    </div>
  )
}
