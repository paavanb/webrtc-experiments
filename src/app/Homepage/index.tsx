import * as React from 'react'
import {css} from '@emotion/core'
import {Link} from 'react-router-dom'

import useUsernameState from '../../hooks/game/useUsernameState'
import useGameKeyState from '../../hooks/game/useGameKeyState'

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
  const [username, setUsername] = useUsernameState('')
  const [gameKey, setGameKey] = useGameKeyState('')

  return (
    <div css={wrapperCss}>
      <main css={mainCss}>
        <form>
          <div>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Username"
            />
          </div>
          <div>
            <input
              type="text"
              value={gameKey}
              onChange={e => setGameKey(e.target.value)}
              placeholder="Game Code"
            />
          </div>
        </form>
        {username.length > 0 && gameKey.length > 0 && (
          <div>
            <div>
              <Link to="/g?h">
                <button type="button">Host a Game</button>
              </Link>
            </div>
            <div>
              <Link to="/g">
                <button type="button">Join Game</button>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
