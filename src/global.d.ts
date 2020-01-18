import {WebTorrent} from 'webtorrent'

declare module 'WebTorrent' {
  interface Instance {
    peerId: string // Missing from typedef
  }
}
