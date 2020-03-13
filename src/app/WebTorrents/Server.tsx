import React, {useState, useCallback, useEffect, useMemo} from 'react'
import {Wire} from 'bittorrent-protocol'
import * as nacl from 'tweetnacl'
import {useLocation} from 'react-router-dom'

import log from '../../lib/log'
import hexdigest from '../../lib/hexdigest'
import omit from '../../lib/omit'
import useStableValue from '../../hooks/useStableValue'
import useTorrent from '../../hooks/useTorrent'
import {SwarmPeer, PeerMetadata} from '../../engine/types'
import useSwarmCommExtension, {SwarmExtendedWire} from '../../engine/useSwarmCommExtension'
import createLoopbackExtensionPair from '../../engine/createLoopbackExtensionPair'
import isNotEmpty from '../../guards/isNotEmpty'

import ConnectionController from './ConnectionController'
import GameServer from './GameServer'
import GameClient from './GameClient'

const SEED = '6c0d50e0-56c9-4b43-bccf-77f346dd0e04'

type PeerMap = Record<string, SwarmPeer>

interface ConnectionState {
  leader: string | null
  conns: PeerMap
}

function useQueryParams(): URLSearchParams {
  const location = useLocation()
  const params = useMemo(() => new URLSearchParams(location.search), [location])
  return params
}

/**
 * Query param `u` corresponds to the username
 */
function useUsername(): string {
  const params = useQueryParams()
  const username = useMemo(() => params.get('u') || new Date().getTime().toString(), [params])

  return username
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

/**
 * Query params:
 * u - username. defaults to current time.
 */
export default function Server(): JSX.Element {
  const username = useUsername()
  const isLeader = useIsLeader()

  const [connState, setConnState] = useState<ConnectionState>(() => ({leader: null, conns: {}}))
  const {leader, conns} = connState
  const setLeader = useCallback(
    (newLeader: string | null) => setConnState(prevState => ({...prevState, leader: newLeader})),
    []
  )
  const setConns = useCallback((fn: (prevConns: PeerMap) => PeerMap) => {
    setConnState(prevState => ({...prevState, conns: fn(prevState.conns)}))
  }, [])
  const [pkHash, setPkHash] = useState<string | null>(null)

  // Ensure that query param state is synced to leader value
  if (isLeader && leader !== pkHash) setLeader(pkHash)

  const signKeyPair = useStableValue(() => {
    const keypair = nacl.sign.keyPair()
    hexdigest(keypair.publicKey).then(setPkHash)
    return keypair
  })
  const swarmCommExtension = useSwarmCommExtension({
    username,
    onPeerAdd: (ext, metadata) => {
      const peerIsLeader = metadata.leader === metadata.id
      setConnState(prevState => ({
        // Join the first peer we find which believes themselves to be the leader
        leader: prevState.leader === null && peerIsLeader ? metadata.id : prevState.leader,
        conns: {
          ...prevState.conns,
          [metadata.id]: {
            metadata,
            ext,
          },
        },
      }))
    },
    signKeyPair,
    onPeerDrop: (_, key) => {
      log('Peer dropped: ', key)
      setConnState(prevState => ({...prevState, conns: omit(prevState.conns, [key])}))
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
    (peer: SwarmPeer, leaderId: string) => {
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

  const torrent = useTorrent(SEED)

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

  // manageLeader
  useEffect(() => {
    // We lost connection with the leader, reset.
    if (!isLeader && leader !== null && conns[leader] === undefined) {
      setConnState(prevState => ({...prevState, leader: null}))
    }
  }, [conns, isLeader, leader])

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
    <div>
      {pkHash && (
        <div>
          <div>
            My name is &#39;{username}&#39; ({pkHash.slice(0, 6)}).
          </div>
          {leaderPeer && <div>I&apos;ve joined {leaderPeer.metadata.username}.</div>}
          {selfMetadata && (
            <div>
              {isLeader && <GameServer peers={rawClientPeers} />}
              {isLeader
                ? localhostServerPeer && (
                    <GameClient
                      playerMetadata={{username}}
                      selfMetadata={selfMetadata}
                      rawServerPeer={localhostServerPeer}
                    />
                  )
                : leaderPeer && (
                    <GameClient
                      playerMetadata={{username}}
                      selfMetadata={selfMetadata}
                      rawServerPeer={leaderPeer}
                    />
                  )}
            </div>
          )}
        </div>
      )}
      <div>
        Connections:
        {Object.keys(conns).map(hash => (
          <ConnectionController
            key={hash}
            peer={conns[hash]}
            onLeaderSelect={setLeader}
            onPeerLeaderChange={changePeerLeader}
            getPeerMetadata={id => conns[id]?.metadata ?? null}
          />
        ))}
      </div>
    </div>
  )
}
