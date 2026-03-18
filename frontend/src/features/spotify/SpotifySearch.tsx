import React, { useState, useEffect, useRef } from 'react'
import {
  Box,
  VStack,
  HStack,
  Input,
  Button,
  Text,
  Image,
  Heading,
  Spinner,
  Alert,
  AlertIcon,
  IconButton,
} from '@chakra-ui/react'
import { FiSearch, FiPlay, FiPause, FiLogIn } from 'react-icons/fi'
import { API_BASE } from '../../config'

declare global {
  interface Window {
    Spotify: any
    onSpotifyWebPlaybackSDKReady: () => void
  }
}

type SpotifyTrack = {
  id: string
  title: string
  artist: string
  album: string
  album_image: string | null
  spotify_url: string
  duration_ms: number
}

const STORAGE_KEY = 'spotify_tokens'

function getStoredTokens(): { accessToken: string; refreshToken: string; expiry: number } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const SpotifySearch: React.FC = () => {
  const [query, setQuery] = useState('')
  const [tracks, setTracks] = useState<SpotifyTrack[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auth
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState<string | null>(null)

  // Player
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const playerRef = useRef<any>(null)

  // OAuthコールバックのURLパラメータを処理 / localStorageから復元
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('access_token')
    const refresh = params.get('refresh_token')
    const expiresIn = params.get('expires_in')

    if (token && refresh) {
      const expiry = Date.now() + parseInt(expiresIn || '3600') * 1000
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ accessToken: token, refreshToken: refresh, expiry }))
      setAccessToken(token)
      setRefreshToken(refresh)
      window.history.replaceState({}, '', '/spotify')
      return
    }

    const stored = getStoredTokens()
    if (!stored) return

    if (Date.now() < stored.expiry - 60000) {
      setAccessToken(stored.accessToken)
      setRefreshToken(stored.refreshToken)
    } else {
      handleRefreshToken(stored.refreshToken)
    }
  }, [])

  const handleRefreshToken = async (refresh: string) => {
    try {
      const res = await fetch(
        `${API_BASE}/spotify/refresh?refresh_token=${encodeURIComponent(refresh)}`,
        { method: 'POST' }
      )
      if (!res.ok) return
      const data = await res.json()
      const stored = getStoredTokens()
      const newTokens = {
        accessToken: data.access_token,
        refreshToken: stored?.refreshToken || refresh,
        expiry: Date.now() + data.expires_in * 1000,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newTokens))
      setAccessToken(data.access_token)
      setRefreshToken(newTokens.refreshToken)
    } catch (e) {
      console.error('Token refresh failed', e)
    }
  }

  // Spotify Web Playback SDK の初期化
  useEffect(() => {
    if (!accessToken) return

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
    }
  }, [accessToken])

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/spotify/search?q=${encodeURIComponent(query)}&limit=10`)
      if (!res.ok) throw new Error('Search failed')
      const data = await res.json()
      setTracks(data.tracks)
    } catch (e) {
      console.error(e)
      setTracks([])
      setError('検索に失敗しました。しばらくしてから再度お試しください。')
    } finally {
      setLoading(false)
    }
  }

  const handlePlay = async (track: SpotifyTrack) => {
    if (!accessToken || !deviceId) return

    // 同じ曲が再生中 → 一時停止
    if (currentTrackId === track.id && isPlaying) {
      playerRef.current?.pause()
      return
    }

    // 同じ曲が一時停止中 → 再開
    if (currentTrackId === track.id && !isPlaying) {
      playerRef.current?.resume()
      return
    }

    // 別の曲 → 再生開始
    await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uris: [`spotify:track:${track.id}`] }),
    })
  }

  const formatDuration = (ms: number) => {
    const m = Math.floor(ms / 60000)
    const s = Math.floor((ms % 60000) / 1000)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <VStack spacing={4} align="stretch">
      <Heading color="pink.400" size="lg">Spotify 検索</Heading>

      {/* 未ログイン */}
      {!accessToken && (
        <Box textAlign="center" py={6} borderRadius="lg" border="1px dashed" borderColor="gray.200">
          <Text color="gray.500" mb={3}>Spotifyアカウントでログインして曲を再生できます</Text>
          <Button
            as="a"
            href={`${API_BASE}/spotify/login`}
            colorScheme="green"
            leftIcon={<FiLogIn />}
          >
            Spotifyでログイン
          </Button>
        </Box>
      )}

      {/* プレイヤー状態インジケーター */}
      {accessToken && (
        <HStack spacing={2} fontSize="xs">
          <Box w={2} h={2} borderRadius="full" bg={isPlayerReady ? 'green.400' : 'yellow.400'} />
          <Text color="gray.400">
            {isPlayerReady ? 'プレイヤー準備完了' : 'プレイヤー初期化中...'}
          </Text>
        </HStack>
      )}

      {/* 検索ボックス */}
      <HStack>
        <Input
          placeholder="曲名・アーティスト名で検索..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          borderColor="pink.200"
          _focus={{ borderColor: 'pink.400' }}
        />
        <Button
          colorScheme="pink"
          onClick={handleSearch}
          isLoading={loading}
          leftIcon={<FiSearch />}
          flexShrink={0}
        >
          検索
        </Button>
      </HStack>

      {/* エラー */}
      {error && (
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          {error}
        </Alert>
      )}

      {/* 読み込み中 */}
      {loading && (
        <Box textAlign="center" py={6}>
          <Spinner color="pink.400" />
        </Box>
      )}

      {/* 結果なし */}
      {!loading && searched && tracks.length === 0 && !error && (
        <Text color="gray.500" textAlign="center" py={6}>
          曲が見つかりませんでした
        </Text>
      )}

      {/* 検索結果 */}
      {!loading && tracks.map((track) => {
        const isThisPlaying = currentTrackId === track.id && isPlaying
        const isThisActive = currentTrackId === track.id

        return (
          <Box
            key={track.id}
            p={3}
            borderRadius="lg"
            border="1px solid"
            borderColor={isThisActive ? 'pink.300' : 'gray.100'}
            bg={isThisActive ? 'pink.50' : 'white'}
            shadow="sm"
            transition="all 0.2s"
          >
            <HStack spacing={3} align="center">
              {track.album_image ? (
                <Image
                  src={track.album_image}
                  alt={track.album}
                  boxSize="50px"
                  borderRadius="md"
                  objectFit="cover"
                  flexShrink={0}
                />
              ) : (
                <Box boxSize="50px" borderRadius="md" bg="gray.100" flexShrink={0} />
              )}

              <Box flex={1} minW={0}>
                <Text fontWeight="bold" fontSize="sm" noOfLines={1}>{track.title}</Text>
                <Text fontSize="xs" color="gray.500" noOfLines={1}>{track.artist}</Text>
                <Text fontSize="xs" color="gray.400">{formatDuration(track.duration_ms)}</Text>
              </Box>

              {accessToken ? (
                <IconButton
                  aria-label={isThisPlaying ? '一時停止' : '再生'}
                  icon={isThisPlaying ? <FiPause /> : <FiPlay />}
                  isRound
                  size="sm"
                  colorScheme="pink"
                  variant={isThisActive ? 'solid' : 'outline'}
                  flexShrink={0}
                  onClick={() => handlePlay(track)}
                  isDisabled={!isPlayerReady}
                />
              ) : (
                <Button size="sm" isDisabled flexShrink={0} fontSize="xs">
                  要ログイン
                </Button>
              )}
            </HStack>
          </Box>
        )
      })}
    </VStack>
  )
}

export default SpotifySearch
