import * as React from 'react'

import WebRTCAppController from '../../components/WebRTCAppController'

import GameServer from './GameServer'
import GameClient from './GameClient'

const SEED = '6c0d50e0-56c9-4b43-bccf-77f346dd0e04'

export default function Game(): JSX.Element {
  return (
    <WebRTCAppController seed={SEED} clientComponent={GameClient} serverComponent={GameServer} />
  )
}
