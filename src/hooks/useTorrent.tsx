import {useEffect, useState} from 'react'
import * as WebTorrent from 'webtorrent'

import log from '../lib/log'

const TRACKERS = ['wss://tracker.openwebtorrent.com']

export default function useTorrent(seed: string): WebTorrent.Torrent | null {
  const [torrent, setTorrent] = useState<WebTorrent.Torrent | null>(null)

  useEffect(() => {
    const client = new WebTorrent()
    log('Initialized client with peer id: ', client.peerId)

    // @ts-ignore The type definition dropped the "name" key, but it's necessary
    // for generating consistent info hashes between clients.
    const newTorrent = client.seed(Buffer.from(seed), {name: seed, announce: TRACKERS})
    setTorrent(newTorrent)

    return () => {
      log('Destroying client...')
      client.destroy(() => log('Client destroyed.'))
    }
  }, [seed])

  return torrent
}
