import * as React from 'react'
import * as WebTorrent from 'webtorrent'

import log from '../../lib/log'

import CommunicationExtension from './extension'

const SEED = '6c0d50e0-56c9-4b43-bccf-77f346dd0e04'

const TRACKERS = ['wss://tracker.openwebtorrent.com', 'wss://tracker.btorrent.xyz']

export default function Server(): JSX.Element {
  const clientRef = React.useRef<WebTorrent.Instance | null>(null)

  React.useEffect(() => {
    const peersSeen = new Set<string>()
    const client = new WebTorrent({
      tracker: {
        getAnnounceOpts: () => ({numwant: 50}),
      },
    })
    log('Initialized client with peer id: ', client.peerId)

    const torrent = client.seed(Buffer.from(SEED), {name: SEED, announce: TRACKERS})
    torrent.on('wire', (wire, address) => {
      wire.use(CommunicationExtension)

      wire.setKeepAlive(true)
      if (!peersSeen.has(wire.peerId)) {
        log('Found new peer: ', wire.peerId)
        peersSeen.add(wire.peerId)
      } else {
        log('Reconnected to peer: ', wire.peerId)
      }

      log('Wire: ', wire)
      wire.on('handshake', (infoHash, peerId, extensions) => {
        log('Handshake: ', infoHash, peerId, extensions)
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
  return <span />
}
