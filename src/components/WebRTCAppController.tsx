import React, {useState, useCallback, useEffect, useLayoutEffect, useMemo} from 'react'
import {Wire} from 'bittorrent-protocol'
import {useLocation} from 'react-router-dom'

import log from '../lib/log'
import hexdigest from '../lib/hexdigest'
import omit from '../lib/omit'
import useUsernameState from '../hooks/game/useUsernameState'
import useGameKeyState from '../hooks/game/useGameKeyState'
import useSignKeyPair from '../hooks/game/useSignKeyPair'
import useTorrent from '../hooks/useTorrent'
import {SwarmPeer, PeerMetadata} from '../engine/types'
import useSwarmCommExtension, {SwarmExtendedWire} from '../engine/useSwarmCommExtension'
import createLoopbackExtensionPair from '../engine/createLoopbackExtensionPair'
import isNotEmpty from '../guards/isNotEmpty'

import ConnectionController from './ConnectionController'

const SEED = '6c0d50e0-56c9-4b43-bccf-77f346dd0e04'

type PeerMap = Record<string, SwarmPeer>

function useQueryParams(): URLSearchParams {
  const location = useLocation()
  const params = useMemo(() => new URLSearchParams(location.search), [location])
  return params
}

/**
 * Query param `h` corresponds to being the leader ('host')
 */
function useIsLeader(): boolean {
  const params = useQueryParams()
  if (params.has('h')) return true
  return false
}

function useLocalhostPeers(metadata: PeerMetadata | null): [SwarmPeer, SwarmPeer] | null {
  return useMemo(() => {
    if (!metadata) return null

    const [ext1, ext2] = createLoopbackExtensionPair(metadata)
    return [
      {metadata, ext: ext1},
      {metadata, ext: ext2},
    ]
  }, [metadata])
}

interface WebRTCAppServerProps {
  peers: SwarmPeer[]
}

interface WebRTCAppClientProps {
  username: string
  serverPeer: SwarmPeer
  selfMetadata: PeerMetadata
}

interface WebRTCAppControllerProps {
  serverComponent: React.ComponentType<WebRTCAppServerProps>
  clientComponent: React.ComponentType<WebRTCAppClientProps>
}

/**
 * Controller for a general WebRTC app.
 * Query params:
 * h - isHost
 */
export default function WebRTCAppController(props: WebRTCAppControllerProps): JSX.Element {
  const {serverComponent: ServerComponent, clientComponent: ClientComponent} = props
  const [username] = useUsernameState(() => new Date().getTime().toString())
  const [gameKey] = useGameKeyState()
  const isLeader = useIsLeader()

  const [leader, setLeader] = useState<string | null>(null)
  const [conns, setConns] = useState<PeerMap>({})
  const [pkHash, setPkHash] = useState<string | null>(null)
  const signKeyPair = useSignKeyPair()

  // Ensure that query param state is synced to leader value
  if (isLeader && leader !== pkHash) setLeader(pkHash)
  const swarmCommExtension = useSwarmCommExtension({
    username,
    onPeerAdd: (ext, metadata) => {
      setConns(prevConns => ({
        ...prevConns,
        [metadata.id]: {
          metadata,
          ext,
        },
      }))
    },
    signKeyPair,
    onPeerDrop: (_, key) => {
      log('Peer dropped: ', key)
      setConns(prevConns => omit(prevConns, [key]))
    },
  })

  const selfMetadata: PeerMetadata | null = useMemo(() => {
    if (pkHash === null) return null
    return {
      id: pkHash,
      username,
      leader,
    }
  }, [pkHash, leader, username])

  const localhostPeers = useLocalhostPeers(selfMetadata)
  const [localhostClientPeer, localhostServerPeer] = localhostPeers || [null, null]

  const rawClientPeers = useMemo(
    () =>
      [
        ...Object.values(conns).filter(peer => pkHash !== null && peer.metadata.leader === pkHash),
        localhostClientPeer,
      ].filter(isNotEmpty),
    [pkHash, conns, localhostClientPeer]
  )

  const changePeerLeader = useCallback(
    (peer: SwarmPeer, leaderId: string | null) => {
      setConns(prevConns => ({
        ...prevConns,
        [peer.metadata.id]: {
          ...prevConns[peer.metadata.id],
          metadata: {
            ...prevConns[peer.metadata.id].metadata,
            leader: leaderId,
          },
        },
      }))
    },
    [setConns]
  )

  const torrent = useTorrent(`${SEED}-${gameKey}`)

  // managePkHash
  useLayoutEffect(() => {
    hexdigest(signKeyPair.publicKey).then(setPkHash)
  }, [signKeyPair])

  // manageHandshake
  useEffect(() => {
    if (!torrent) return undefined
    const onWire = (wire: Wire): void => {
      // eslint-disable-next-line no-param-reassign
      const extWire = wire as SwarmExtendedWire

      extWire.use(swarmCommExtension(leader))

      extWire.setKeepAlive(true)

      wire.on('handshake', (infoHash, remotePeerId, extensions) => {
        log('Handshake: ', infoHash, remotePeerId, extensions)
      })
    }

    torrent.on('wire', onWire)

    return () => {
      torrent.off('wire', onWire)
    }
  }, [leader, swarmCommExtension, torrent])

  // manageLeaderDrop
  useEffect(() => {
    // We lost connection with the leader, reset.
    if (!isLeader && leader !== null && conns[leader] === undefined) {
      setLeader(null)
    }
  }, [conns, isLeader, leader])

  // Rejoin a new leader if we currently do not have a leader and a peer recognizes themselves
  // as the leader
  // manageLeaderChange
  useEffect(() => {
    // Candidates are peers which recognize themselves to be the leader
    const candidateLeaders = Object.values(conns).filter(
      peer => peer.metadata.leader === peer.metadata.id
    )
    if (!isLeader && leader === null && candidateLeaders.length) {
      setLeader(candidateLeaders[0].metadata.id)
    }
  }, [conns, isLeader, leader, setLeader])

  // Update every wire to the correct leader value
  // manageWireLeader
  useEffect(() => {
    Object.values(conns).forEach(({ext}) => ext.setLeader(leader))
    // Why we don't have `conns` as a dependency: We only want to notify current connections of a leader change.
    // New connections are notified on handshake.
    // NOTE: If this implementation changes, must re-evaluate usage of eslint-disable-line!
  }, [leader]) // eslint-disable-line react-hooks/exhaustive-deps

  const leaderPeer = leader ? conns[leader] ?? null : null

  return (
    <div css={{overflowX: 'hidden'}}>
      {selfMetadata && (
        <div>
          {isLeader && <ServerComponent peers={rawClientPeers} />}
          {isLeader
            ? localhostServerPeer && (
                <ClientComponent
                  username={username}
                  selfMetadata={selfMetadata}
                  serverPeer={localhostServerPeer}
                />
              )
            : leaderPeer && (
                <ClientComponent
                  username={username}
                  selfMetadata={selfMetadata}
                  serverPeer={leaderPeer}
                />
              )}
        </div>
      )}
      {Object.keys(conns).map(hash => (
        <ConnectionController key={hash} peer={conns[hash]} onPeerLeaderChange={changePeerLeader} />
      ))}
    </div>
  )
}
