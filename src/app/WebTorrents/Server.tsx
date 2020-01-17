import * as React from 'react'
import * as WebTorrent from 'webtorrent'

import useStableValue from '../../hooks/useStableValue'

const SEED = '93ab6361-37fe-4d6a-b0ee-23c72cc938e2'

const TRACKERS = [
  'wss://hub.bugout.link',
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.btorrent.xyz',
]

export default function Server(): JSX.Element {
  // connect to server using its public address
  const torrentClient = (() => {
    console.log('CLIENT')
    const peersSeen = new Set<string>()
    const client = new WebTorrent({
      tracker: {
        getAnnounceOpts: () => ({numwant: 50}),
      },
    })

    const torrent = client.seed(Buffer.from(SEED), {name: SEED, announce: TRACKERS})
    torrent.on('wire', (wire, address) => {
      if (!peersSeen.has(wire.peerId)) {
        console.debug('Found new peer: ', wire.peerId)
      } else {
        console.debug('Reconnected to peer: ', wire.peerId)
        peersSeen.add(wire.peerId)
      }
      console.debug('Wire: ', wire)
      wire.on('handshake', (infoHash, peerId, extensions) => {
        console.debug('Handshake: ', infoHash, peerId, extensions)
      })
    })

    return client
  })()
  return <span />
}
