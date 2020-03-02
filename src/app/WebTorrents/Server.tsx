import * as React from 'react'
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
  return React.useMemo(() => {
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
  const [leader, setLeader] = React.useState<string | null>(null)
  const username = useUsername()
  const [clientPkHash, setClientPkHash] = React.useState<string | null>(null)
  const [conns, setConns] = React.useState<Record<string, SwarmPeer>>({})
  const [text, setText] = React.useState('')
  const signKeyPair = useStableValue(() => {
    const keypair = nacl.sign.keyPair()
    hexdigest(keypair.publicKey).then(setClientPkHash)
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
    onPeerDrop: (_, pkHash) => {
      setConns(prevConns => omit(prevConns, [pkHash]))
    },
  })

  const selfMetadata: PeerMetadata | null = React.useMemo(() => {
    if (clientPkHash === null) return null
    return {
      id: clientPkHash,
      username,
      leader,
    }
  }, [clientPkHash, leader, username])

  const localhostPeers = useLocalhostPeers(selfMetadata)
  const [localhostClientPeer, localhostServerPeer] = localhostPeers || [null, null]

  const isLeader = clientPkHash === leader
  const rawClientPeers = React.useMemo(
    () =>
      [
        ...Object.values(conns).filter(
          peer => clientPkHash !== null && peer.metadata.leader === clientPkHash
        ),
        localhostClientPeer,
      ].filter(isNotEmpty),
    [clientPkHash, conns, localhostClientPeer]
  )

  const selectLeader = React.useCallback(
    (leaderId: string) => {
      setLeader(leaderId)
      // Update every wire to the correct leader value
      Object.values(conns).forEach(({ext}) => ext.setLeader(leaderId))
    },
    [conns]
  )

  const changePeerLeader = React.useCallback((peer: SwarmPeer, leaderId: string) => {
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
  React.useEffect(() => {
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

  const handleMessageSend = React.useCallback(() => {
    Object.keys(conns).forEach(hash => {
      conns[hash].ext.send({type: 'message', message: text})
    })
  }, [conns, text])

  return (
    <div>
      {clientPkHash && (
        <div>
          <div>
            My name is &#39;{username}&#39; ({clientPkHash.slice(0, 6)}).
          </div>
          <button onClick={() => selectLeader(clientPkHash)} type="button">
            Lead a game
          </button>
          {selfMetadata && (
            <div>
              {isLeader && <GameServer peers={rawClientPeers} />}
              {!isLeader && leader && (
                <GameClient
                  playerMetadata={{username}}
                  selfMetadata={selfMetadata}
                  rawServerPeer={conns[leader]}
                />
              )}
              {isLeader && localhostServerPeer && (
                <GameClient
                  playerMetadata={{username}}
                  selfMetadata={selfMetadata}
                  rawServerPeer={localhostServerPeer}
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
