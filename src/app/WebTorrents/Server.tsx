import React, {useState, useCallback, useEffect, useLayoutEffect, useMemo} from 'react'
import {Wire} from 'bittorrent-protocol'
import * as nacl from 'tweetnacl'

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

function useUsername(): string {
  const username = useStableValue(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('u') || new Date().getTime().toString()
  })

  return username
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
  const [leader, setLeader] = useState<string | null>(null)
  const username = useUsername()
  const [pkHash, setPkHash] = useState<string | null>(null)
  const [conns, setConns] = useState<Record<string, SwarmPeer>>({})
  const [text, setText] = useState('')
  const signKeyPair = useStableValue(() => {
    const keypair = nacl.sign.keyPair()
    hexdigest(keypair.publicKey).then(setPkHash)
    return keypair
  })
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

  const isLeader = pkHash === leader
  const rawClientPeers = useMemo(
    () =>
      [
        ...Object.values(conns).filter(peer => pkHash !== null && peer.metadata.leader === pkHash),
        localhostClientPeer,
      ].filter(isNotEmpty),
    [pkHash, conns, localhostClientPeer]
  )

  const selectLeader = useCallback(
    (leaderId: string) => {
      setLeader(leaderId)
      // Update every wire to the correct leader value
      Object.values(conns).forEach(({ext}) => ext.setLeader(leaderId))
    },
    [conns]
  )

  const changePeerLeader = useCallback((peer: SwarmPeer, leaderId: string) => {
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
  }, [])

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
  useLayoutEffect(() => {
    // We lost connection with the leader, reset.
    if (!isLeader && leader !== null && conns[leader] === undefined) {
      setLeader(null)
    }
  }, [conns, isLeader, leader])

  const handleMessageSend = useCallback(() => {
    Object.keys(conns).forEach(hash => {
      conns[hash].ext.send({type: 'message', message: text})
    })
  }, [conns, text])

  return (
    <div>
      {pkHash && (
        <div>
          <div>
            My name is &#39;{username}&#39; ({pkHash.slice(0, 6)}).
          </div>
          <button onClick={() => selectLeader(pkHash)} type="button">
            Lead a game
          </button>
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
                : leader && (
                    <GameClient
                      playerMetadata={{username}}
                      selfMetadata={selfMetadata}
                      rawServerPeer={conns[leader]}
                    />
                  )}
            </div>
          )}
        </div>
      )}
      <div>
        <textarea value={text} onChange={e => setText(e.target.value)} />
      </div>
      <div>
        <button onClick={handleMessageSend} type="button">
          Send Message
        </button>
      </div>
      <div>
        Connections:
        {Object.keys(conns).map(hash => (
          <ConnectionController
            key={hash}
            peer={conns[hash]}
            onLeaderSelect={selectLeader}
            onPeerLeaderChange={changePeerLeader}
            getPeerMetadata={id => conns[id]?.metadata ?? null}
          />
        ))}
      </div>
    </div>
  )
}
