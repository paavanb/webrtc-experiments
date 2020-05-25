import * as React from 'react'

import {Vector3D} from './types'

interface BallProps {
  position: Vector3D
  width: number
  height: number
}

export default function Ball(props: BallProps): JSX.Element {
  const {position, width, height} = props

  return (
    <svg width={width} height={height}>
      <circle cx={width - position[0]} cy={position[1]} fill="red" r={10} />
    </svg>
  )
}
