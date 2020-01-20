import {WebTorrent} from 'webtorrent'
import {Wire} from 'bittorrent-protocol'

declare module 'webtorrent' {
  interface Instance {
    peerId: string // Missing from typedef
  }
}

declare module 'bittorrent-protocol' {
  interface Wire {
    extended: (extensionName: string, data: unknown) => void
  }
}
