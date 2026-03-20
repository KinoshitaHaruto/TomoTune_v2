import React, { useState } from 'react'
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
import { useSpotify } from '../../contexts/SpotifyContext'
import { API_BASE } from '../../config'

type SpotifyTrack = {
  id: string
  title: string
  artist: string
  album: string
  album_image: string | null
  spotify_url: string
  duration_ms: number
}

const SpotifySearch: React.FC = () => {
  const { isConnected, isPlayerReady, currentTrackId, isPlaying, playTrack, login } = useSpotify()

  const [query, setQuery] = useState('')
  const [tracks, setTracks] = useState<SpotifyTrack[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const formatDuration = (ms: number) => {
    const m = Math.floor(ms / 60000)
    const s = Math.floor((ms % 60000) / 1000)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <VStack spacing={4} align="stretch">
      <Heading color="pink.400" size="lg">Spotify 検索</Heading>

      {/* 未ログイン */}
      {!isConnected && (
        <Box textAlign="center" py={6} borderRadius="lg" border="1px dashed" borderColor="gray.200">
          <Text color="gray.500" mb={3}>Spotifyアカウントでログインして曲を再生できます</Text>
          <Button colorScheme="green" leftIcon={<FiLogIn />} onClick={login}>
            Spotifyでログイン
          </Button>
        </Box>
      )}

      {/* プレイヤー状態インジケーター */}
      {isConnected && (
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

              {isConnected ? (
                <IconButton
                  aria-label={isThisPlaying ? '一時停止' : '再生'}
                  icon={isThisPlaying ? <FiPause /> : <FiPlay />}
                  isRound
                  size="sm"
                  colorScheme="pink"
                  variant={isThisActive ? 'solid' : 'outline'}
                  flexShrink={0}
                  onClick={() => playTrack(track.id)}
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
