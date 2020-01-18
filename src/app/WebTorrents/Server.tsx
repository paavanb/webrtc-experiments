import * as React from 'react'
import * as WebTorrent from 'webtorrent'
import {Wire} from 'bittorrent-protocol'

import log from '../../lib/log'

import swarmCommunicationExtension, {SwarmCommExtension} from './extension'

interface SwarmExtendedWire extends Wire {
  swarm_comm_ext: SwarmCommExtension
}

const SEED = '6c0d50e0-56c9-4b43-bccf-77f346dd0e04'

const TRACKERS = ['wss://tracker.openwebtorrent.com', 'wss://tracker.btorrent.xyz']

export default function Server(): JSX.Element {
  const clientRef = React.useRef<WebTorrent.Instance | null>(null)
  const [conns, setConns] = React.useState<Record<string, SwarmCommExtension>>({})
  const [text, setText] = React.useState('')

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
      const extension = swarmCommunicationExtension()
      wire.use(extension)
      // eslint-disable-next-line no-param-reassign
      const extWire = wire as SwarmExtendedWire
      const {peerId} = extWire

      setConns(prevWires => ({
        ...prevWires,
        [peerId]: extWire.swarm_comm_ext,
      }))

      wire.setKeepAlive(true)

      if (!peersSeen.has(wire.peerId)) {
        log('Found new peer: ', peerId)
        peersSeen.add(wire.peerId)
      } else {
        log('Reconnected to peer: ', peerId)
      }

      log('Wire: ', wire)
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
  }, [])

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