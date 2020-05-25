import React, {useEffect, useState} from 'react'

import clamp from '../../lib/clamp'

import {Vector3D, Vector2D} from './types'

const DRAG = 0.95

interface PositionProps {
  accel: Vector3D
  children: ([posX, posY, posZ]: Vector3D) => React.ReactNode
  boundX?: Vector2D
  boundY?: Vector2D
  boundZ?: Vector2D
}

export default function Position(props: PositionProps): JSX.Element {
  const {accel, boundX, boundY, boundZ, children} = props
  const [velocity, setVelocity] = useState([0, 0, 0] as Vector3D)
  const [position, setPosition] = useState([0, 0, 0] as Vector3D)

  useEffect(() => {
    setVelocity(vel => [
      (vel[0] + accel[0]) * DRAG,
      (vel[1] + accel[1]) * DRAG,
      (vel[2] + accel[2]) * DRAG,
    ])
  }, [accel])

  useEffect(() => {
    setPosition(pos => [
      boundX ? clamp(boundX[0], boundX[1], pos[0] + velocity[0]) : pos[0],
      boundY ? clamp(boundY[0], boundY[1], pos[1] + velocity[1]) : pos[1],
      boundZ ? clamp(boundZ[0], boundZ[1], pos[2] + velocity[2]) : pos[2],
    ])
  }, [velocity, boundX, boundY, boundZ])

  return <>{children(position)}</>
}
