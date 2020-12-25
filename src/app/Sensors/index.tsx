import * as React from 'react'

import WebRTCAppController from '../../components/WebRTCAppController'

import SensorServer from './SensorServer'
import SensorClient from './SensorClient'

const SEED = '6e7a8f72-c556-4ccd-a573-4a2fd1f3ada5'

export default function Game(): JSX.Element {
  return (
    <WebRTCAppController
      seed={SEED}
      clientComponent={SensorClient}
      serverComponent={SensorServer}
    />
  )
}
