import * as React from 'react'
import * as WebTorrent from 'webtorrent'

import useStableValue from '../../hooks/useStableValue'

const SEED = '6c0d50e0-56c9-4b43-bccf-77f346dd0e04'

const TRACKERS = ['wss://tracker.openwebtorrent.com', 'wss://tracker.btorrent.xyz']

function log(...values: any[]) {
  console.debug('[WT] ', ...values)
}

export default function Server(): JSX.Element {
  // connect to server using its public address
  const torrentClient = (() => {
    const peersSeen = new Set<string>()
    const client = new WebTorrent({
      tracker: {
        getAnnounceOpts: () => ({numwant: 50}),
      },
    })
    log('Initialized client with peer id: ', client.peerId)

    const torrent = client.seed(Buffer.from(SEED), {name: SEED, announce: TRACKERS})
    torrent.on('wire', (wire, address) => {
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

    return client
  })()
  return <span />
}
