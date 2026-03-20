import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { API_BASE } from '../config'

declare global {
  interface Window {
    Spotify: any
    onSpotifyWebPlaybackSDKReady: () => void
  }
}

const STORAGE_KEY = 'spotify_tokens'

interface StoredTokens {
  accessToken: string
  refreshToken: string
  expiry: number
}

interface SpotifyContextType {
  // 認証状態
  isConnected: boolean
  isPremium: boolean
  accessToken: string | null
  login: () => void
  logout: () => void
  // Web Playback SDK
  isPlayerReady: boolean
  currentTrackId: string | null
  isPlaying: boolean
  playTrack: (trackId: string) => Promise<void>
}

const SpotifyContext = createContext<SpotifyContextType>({
  isConnected: false,
  isPremium: false,
  accessToken: null,
  login: () => {},
  logout: () => {},
  isPlayerReady: false,
  currentTrackId: null,
  isPlaying: false,
  playTrack: async () => {},
})

export const SpotifyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 認証
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState<string | null>(null)
  const [isPremium, setIsPremium] = useState(false)

  // Web Playback SDK
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const playerRef = useRef<any>(null)

  const getStoredTokens = (): StoredTokens | null => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }

  const saveTokens = (tokens: StoredTokens) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens))
  }

  const fetchPremiumStatus = useCallback(async (token: string) => {
    try {
      const res = await fetch(`${API_BASE}/spotify/me?access_token=${encodeURIComponent(token)}`)
      if (!res.ok) return
      const data = await res.json()
      setIsPremium(data.is_premium)
    } catch {
      setIsPremium(false)
    }
  }, [])

  const applyTokens = useCallback((access: string, refresh: string) => {
    setAccessToken(access)
    setRefreshToken(refresh)
    fetchPremiumStatus(access)
  }, [fetchPremiumStatus])

  const handleRefresh = useCallback(async (refresh: string) => {
    try {
      const res = await fetch(
        `${API_BASE}/spotify/refresh?refresh_token=${encodeURIComponent(refresh)}`,
        { method: 'POST' }
      )
      if (!res.ok) return
      const data = await res.json()
      const stored = getStoredTokens()
      const newTokens: StoredTokens = {
        accessToken: data.access_token,
        refreshToken: stored?.refreshToken || refresh,
        expiry: Date.now() + data.expires_in * 1000,
      }
      saveTokens(newTokens)
      applyTokens(newTokens.accessToken, newTokens.refreshToken)
    } catch {
      // リフレッシュ失敗時は未接続状態のまま
    }
  }, [applyTokens])

  // OAuthコールバックURLパラメータ処理 / localStorage復元
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('access_token')
    const refresh = params.get('refresh_token')
    const expiresIn = params.get('expires_in')

    if (token && refresh) {
      const expiry = Date.now() + parseInt(expiresIn || '3600') * 1000
      const tokens: StoredTokens = { accessToken: token, refreshToken: refresh, expiry }
      saveTokens(tokens)
      applyTokens(token, refresh)
      window.history.replaceState({}, '', window.location.pathname)
      return
    }

    const stored = getStoredTokens()
    if (!stored) return

    if (Date.now() < stored.expiry - 60000) {
      applyTokens(stored.accessToken, stored.refreshToken)
    } else {
      handleRefresh(stored.refreshToken)
    }
  }, [applyTokens, handleRefresh])

  // Web Playback SDK の初期化（Premiumログイン時のみ）
  useEffect(() => {
    if (!accessToken || !isPremium) return

    const initPlayer = (token: string) => {
      if (playerRef.current) {
        playerRef.current.disconnect()
      }

      const player = new window.Spotify.Player({
        name: 'TomoTune Player',
        getOAuthToken: (cb: (t: string) => void) => cb(token),
        volume: 0.7,
      })

      player.addListener('ready', ({ device_id }: { device_id: string }) => {
        setDeviceId(device_id)
        setIsPlayerReady(true)
      })

      player.addListener('not_ready', () => setIsPlayerReady(false))

      player.addListener('player_state_changed', (state: any) => {
        if (!state) return
        setCurrentTrackId(state.track_window?.current_track?.id ?? null)
        setIsPlaying(!state.paused)
      })

      player.connect()
      playerRef.current = player
    }

    if (window.Spotify) {
      initPlayer(accessToken)
    } else {
      const script = document.createElement('script')
      script.src = 'https://sdk.scdn.co/spotify-player.js'
      script.async = true
      document.body.appendChild(script)
      window.onSpotifyWebPlaybackSDKReady = () => initPlayer(accessToken)
    }

    return () => {
      playerRef.current?.disconnect()
      playerRef.current = null
    }
  }, [accessToken, isPremium])

  // 再生操作（同じ曲: トグル、別の曲: 新規再生）
  const playTrack = useCallback(async (trackId: string) => {
    if (!accessToken || !deviceId || !isPlayerReady) return

    if (currentTrackId === trackId && isPlaying) {
      playerRef.current?.pause()
      return
    }

    if (currentTrackId === trackId && !isPlaying) {
      playerRef.current?.resume()
      return
    }

    await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uris: [`spotify:track:${trackId}`] }),
    })
  }, [accessToken, deviceId, isPlayerReady, currentTrackId, isPlaying])

  const login = () => {
    window.location.href = `${API_BASE}/spotify/login`
  }

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY)
    playerRef.current?.disconnect()
    playerRef.current = null
    setAccessToken(null)
    setRefreshToken(null)
    setIsPremium(false)
    setIsPlayerReady(false)
    setCurrentTrackId(null)
    setIsPlaying(false)
    setDeviceId(null)
  }

  return (
    <SpotifyContext.Provider value={{
      isConnected: !!accessToken,
      isPremium,
      accessToken,
      login,
      logout,
      isPlayerReady,
      currentTrackId,
      isPlaying,
      playTrack,
    }}>
      {children}
    </SpotifyContext.Provider>
  )
}

export const useSpotify = () => useContext(SpotifyContext)
