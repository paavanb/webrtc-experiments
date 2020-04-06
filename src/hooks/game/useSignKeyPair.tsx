import {useMemo} from 'react'
import * as nacl from 'tweetnacl'
import createPersistedState from 'use-persisted-state'

const useKeypairState = createPersistedState('keypair', window.sessionStorage)

function serializeUint8(arr: Uint8Array): number[] {
  return arr
    .toString()
    .split(',')
    .map(Number)
}

export default function useSignKeyPair(): nacl.SignKeyPair {
  const [jsonSignKeyPair] = useKeypairState(() => {
    const keypair = nacl.sign.keyPair()
    return {
      publicKey: serializeUint8(keypair.publicKey),
      secretKey: serializeUint8(keypair.secretKey),
    }
  })

  const signKeyPair = useMemo<nacl.SignKeyPair>(
    () => ({
      publicKey: Uint8Array.from(jsonSignKeyPair.publicKey),
      secretKey: Uint8Array.from(jsonSignKeyPair.secretKey),
    }),
    [jsonSignKeyPair]
  )

  return signKeyPair
}
