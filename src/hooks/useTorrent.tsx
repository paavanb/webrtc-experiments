import {useEffect, useState} from 'react'
import * as WebTorrent from 'webtorrent'

import log from '../lib/log'

const TRACKERS = ['wss://tracker.openwebtorrent.com']

export default function useTorrent(seed: string): WebTorrent.Torrent | null {
  const [torrent, setTorrent] = useState<WebTorrent.Torrent | null>(null)

  useEffect(() => {
    const client = new WebTorrent()
    log('Initialized client with peer id: ', client.peerId)

    const buf = Buffer.from(seed)
    // @ts-ignore Webtorrent expects "name" field on buffer objects
    buf.name = seed
    const newTorrent = client.seed(buf, {
      announce: TRACKERS,
      getAnnounceOpts: () => ({
        numwant: 10,
        left: 1, // Always pretend to be missing a piece so that the tracker connects this client to peers
      }),
    })
    setTorrent(newTorrent)

    return () => {
      log('Destroying client...')
      client.destroy(() => log('Client destroyed.'))
    }
  }, [seed])

  return torrent
}
