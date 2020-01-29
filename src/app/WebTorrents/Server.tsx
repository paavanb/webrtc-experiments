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

function useTorrent(): WebTorrent.Torrent | null {
  const torrentRef = React.useRef<WebTorrent.Torrent | null>(null)
  const clientRef = React.useRef<WebTorrent.Instance | null>(null)

  React.useEffect(() => {
    clientRef.current = new WebTorrent({
      tracker: {
        getAnnounceOpts: () => ({numwant: 50}),
      },
    })
    log('Initialized client with peer id: ', clientRef.current.peerId)

    return () => {
      const client = clientRef.current
      if (client) {
        log('Destroying client...')
        client.destroy(() => log('Client destroyed.'))
      }
    }
  }, [])

  React.useEffect(() => {
    if (!clientRef.current) return
    torrentRef.current = clientRef.current.seed(Buffer.from(SEED), {name: SEED, announce: TRACKERS})
  }, [])

  return torrentRef.current
}

export default function Server(): JSX.Element {
  const [leader, setLeader] = React.useState<string | null>(null)
  const username = useUsername()
  const [clientPkHash, setClientPkHash] = React.useState<string | null>(null)
  const [conns, setConns] = React.useState<Record<string, SwarmPeer>>({})
  const [text, setText] = React.useState('')
  const swarmCommExtension = useSwarmCommExtension({
    username,
    onPeerAdd: (ext, metadata) => {
      setConns(prevConns => ({
        ...prevConns,
        [metadata.id]: {
          metadata,
          ext,
        },
      }))
    },
    onPeerDrop: (_, pkHash) => {
      setConns(prevConns => omit(prevConns, [pkHash]))
    },
    onGenerateKey: pkHash => setClientPkHash(pkHash),
  })

  const isLeader = clientPkHash === leader

  const selectLeader = React.useCallback(
    (leaderId: string) => {
      setLeader(leaderId)
      // Update every wire to the correct leader value
      Object.values(conns).forEach(({ext}) => ext.setLeader(leaderId))
    },
    [conns]
  )

  const changePeerLeader = React.useCallback((peer: SwarmPeer, leaderId: string) => {
    setConns(prevConns => ({
      ...prevConns,
      [peer.metadata.id]: {
        ...prevConns[peer.metadata.id],
        metadata: {
          ...prevConns[peer.metadata.id].metadata,
          leader: leaderId,
        },
      },
    }))
  }, [])

  const torrent = useTorrent()

  React.useEffect(() => {
    if (!torrent) return undefined
    const onWire = (wire: Wire): void => {
      // eslint-disable-next-line no-param-reassign
      const extWire = wire as SwarmExtendedWire

      extWire.use(swarmCommExtension(leader))

      extWire.setKeepAlive(true)

      wire.on('handshake', (infoHash, remotePeerId, extensions) => {
        log('Handshake: ', infoHash, remotePeerId, extensions)
      })
    }

    torrent.on('wire', onWire)

    return () => {
      torrent.off('wire', onWire)
    }
  }, [leader, swarmCommExtension, torrent])

  const handleMessageSend = React.useCallback(() => {
    Object.keys(conns).forEach(hash => {
      conns[hash].ext.send({type: 'message', message: text})
    })
  }, [conns, text])

  const leaderText = React.useMemo(() => {
    if (leader === null) return "I'm alone."
    if (isLeader) return "I'm leading a game."
    return `I've joined ${conns[leader].metadata.username} (${leader.slice(0, 6)})`
  }, [conns, isLeader, leader])

  return (
    <div>
      {clientPkHash && (
        <div>
          <div>
            My name is &#39;{username}&#39; ({clientPkHash.slice(0, 6)}). {leaderText}
          </div>
          <button onClick={() => selectLeader(clientPkHash)} type="button">
            Lead a game
          </button>
        </div>
      )}
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
          <ConnectionController
            key={hash}
            peer={conns[hash]}
            onLeaderSelect={selectLeader}
            onPeerLeaderChange={changePeerLeader}
            getPeerMetadata={id => conns[id]?.metadata ?? null}
          />
        ))}
      </div>
    </div>
  )
}
