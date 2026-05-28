import { useEffect, useState } from 'react'
import NetInfo from '@react-native-community/netinfo'

export type NetworkStatus = 'online' | 'offline' | 'unknown'

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>('unknown')

  useEffect(() => {
    // Fetch initial state immediately instead of waiting for an event
    NetInfo.fetch().then(state => {
      setStatus(state.isConnected ? 'online' : 'offline')
    })

    const unsub = NetInfo.addEventListener(state => {
      setStatus(state.isConnected ? 'online' : 'offline')
    })
    return unsub
  }, [])

  return status
}
