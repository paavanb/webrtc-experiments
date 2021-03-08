import React, {useMemo} from 'react'
import {List, ListItem, ListItemText, ListItemIcon} from '@material-ui/core'
import {AccountCircle as AccountCircleIcon} from '@material-ui/icons'
import {css} from '@emotion/core'

import {SwarmPeer} from '../../../../engine/types'
import {ClientId} from '../../game/types'

const onlineIconCss = css`
  color: green;
`

interface UsersPageProps {
  clientId: ClientId
  peers: SwarmPeer[]
}

export default function UsersPage(props: UsersPageProps): JSX.Element {
  const {clientId, peers} = props
  const otherPeers = useMemo(() => peers.filter((peer) => peer.metadata.id !== clientId), [
    peers,
    clientId,
  ])

  return (
    <List>
      {otherPeers.map((peer) => (
        <ListItem key={peer.metadata.id} button>
          <ListItemIcon>
            <AccountCircleIcon css={onlineIconCss} />
          </ListItemIcon>
          <ListItemText primary={peer.metadata.username} />
        </ListItem>
      ))}
    </List>
  )
}
