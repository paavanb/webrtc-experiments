import * as React from 'react'
import * as WebTorrent from 'webtorrent'
import {Wire} from 'bittorrent-protocol'

import log from '../../lib/log'
import omit from '../../lib/omit'
import useStableValue from '../../hooks/useStableValue'

import {SwarmPeer} from './types'
import useSwarmCommExtension, {SwarmExtendedWire} from './useSwarmCommExtension'
import ConnectionController from './ConnectionController'

const SEED = '6c0d50e0-56c9-4b43-bccf-77f346dd0e04'

const TRACKERS = ['wss://tracker.openwebtorrent.com', 'wss://tracker.btorrent.xyz']

function useUsername(): string {
  const username = useStableValue(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('u') || new Date().getTime().toString()
  })

  return username
}

export default function Server(): JSX.Element {
  const clientRef = React.useRef<WebTorrent.Instance | null>(null)
  const username = useUsername()
  const [clientPkHash, setClientPkHash] = React.useState<string | null>(null)
  const [conns, setConns] = React.useState<Record<string, SwarmPeer>>({})
  const [text, setText] = React.useState('')
  const swarmCommExtension = useSwarmCommExtension({
    username,
    onPeerAdd: (ext, pkHash, metadata) => {
      setConns(prevConns => ({
        ...prevConns,
        [pkHash]: {
          id: pkHash,
          username: metadata.username,
          ext,
        },
      }))
    },
    onPeerDrop: (_, pkHash) => {
      setConns(prevConns => omit(prevConns, [pkHash]))
    },
    onGenerateKey: pkHash => setClientPkHash(pkHash),
  })

  React.useEffect(() => {
    const peersSeen = new Set<string>()
    const client = new WebTorrent({
      tracker: {
        getAnnounceOpts: () => ({numwant: 50}),
      },
    })
    log('Initialized client with peer id: ', client.peerId)

    const torrent = client.seed(Buffer.from(SEED), {name: SEED, announce: TRACKERS})
    torrent.on('wire', (wire: Wire) => {
      // eslint-disable-next-line no-param-reassign
      const extWire = wire as SwarmExtendedWire
      const {peerId} = extWire

      extWire.use(swarmCommExtension)

      extWire.setKeepAlive(true)

      if (!peersSeen.has(wire.peerId)) {
        log('Found new peer: ', peerId)
        peersSeen.add(wire.peerId)
      } else {
        log('Reconnected to peer: ', peerId)
      }

      wire.on('handshake', (infoHash, remotePeerId, extensions) => {
        log('Handshake: ', infoHash, remotePeerId, extensions)
      })
    })

    clientRef.current = client
    return () => {
      if (clientRef.current) {
        log('Destroying client...')
        clientRef.current.destroy(() => log('Client destroyed.'))
      }
    }
  }, [swarmCommExtension])

  const handleMessageSend = React.useCallback(() => {
    Object.keys(conns).forEach(hash => {
      conns[hash].ext.send({type: 'message', message: text})
    })
  }, [conns, text])

  return (
    <div>
      <div>
        {clientPkHash && (
          <div>
            My name is &#39;{username}&#39; and my id is {clientPkHash.slice(0, 8)}
          </div>
        )}
      </div>
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
          <ConnectionController key={hash} peer={conns[hash]} />
        ))}
      </div>
    </div>
  )
}
