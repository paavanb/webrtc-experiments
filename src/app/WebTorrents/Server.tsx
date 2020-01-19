import * as React from 'react'
import * as WebTorrent from 'webtorrent'
import {Wire} from 'bittorrent-protocol'

import log from '../../lib/log'

import useSwarmCommExtension, {SwarmExtendedWire, SwarmCommExtension} from './useSwarmCommExtension'

const SEED = '6c0d50e0-56c9-4b43-bccf-77f346dd0e04'

const TRACKERS = ['wss://tracker.openwebtorrent.com', 'wss://tracker.btorrent.xyz']

export default function Server(): JSX.Element {
  const clientRef = React.useRef<WebTorrent.Instance | null>(null)
  const [conns, setConns] = React.useState<Record<string, SwarmCommExtension>>({})
  const [text, setText] = React.useState('')
  const swarmCommExtension = useSwarmCommExtension({id: 'DUMMY'})

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
      wire.use(swarmCommExtension)
      // eslint-disable-next-line no-param-reassign
      const extWire = wire as SwarmExtendedWire
      const {peerId} = extWire

      wire.setKeepAlive(true)

      if (!peersSeen.has(wire.peerId)) {
        log('Found new peer: ', peerId)
        peersSeen.add(wire.peerId)
      } else {
        log('Reconnected to peer: ', peerId)
      }

      wire.on('handshake', (infoHash, remotePeerId, extensions) => {
        log('Handshake: ', infoHash, remotePeerId, extensions)
      })

      extWire.swarm_comm_ext.on('peerAdd', (publickey, metadata) => {
        log('Peer added: ', publickey)
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
    Object.keys(conns).forEach(peerId => {
      conns[peerId].send({message: text})
    })
  }, [conns, text])

  return (
    <div>
      <textarea value={text} onChange={e => setText(e.target.value)} />
      <button onClick={handleMessageSend} type="button">
        Send Message
      </button>
    </div>
  )
}
