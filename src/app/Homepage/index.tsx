import * as React from 'react'
import {css} from '@emotion/core'
import {Link} from 'react-router-dom'
import {Button, TextField} from '@material-ui/core'

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

const formCss = css({
  "& > *": {
    margin: "1rem",
  }
})

export default function Homepage(): JSX.Element {
  const [username, setUsername] = useUsernameState('')
  const [gameKey, setGameKey] = useGameKeyState('')

  return (
    <div css={wrapperCss}>
      <main css={mainCss}>
        <form css={formCss}>
          <div>
            <TextField
              value={username}
              onChange={e => setUsername(e.target.value)}
              label="Username"
              variant="outlined"
            />
          </div>
          <div>
            <TextField
              value={gameKey}
              onChange={e => setGameKey(e.target.value)}
              label="Game Code"
              variant="outlined"
            />
          </div>
          {username.length > 0 && gameKey.length > 0 && (
            <>
              <div>
                <Link to="/g?h">
                  <Button variant="contained" color="primary">Host a Game</Button>
                </Link>
              </div>
              <div>
                <Link to="/g">
                  <Button variant="contained" color="secondary">Join Game</Button>
                </Link>
              </div>
            </>
          )}
        </form>
      </main>
    </div>
  )
}
