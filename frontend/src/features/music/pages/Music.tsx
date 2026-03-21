import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Heading,
  Text,
  VStack,
  useToast,
  HStack,
  Switch,
  Button,
} from '@chakra-ui/react'
import { FiLogIn } from 'react-icons/fi'
import MusicCard from '../components/MusicCard'
import SpotifySection from '../components/SpotifySection'
import { API_BASE } from '../../../config'
import { usePlayer } from '../../../contexts/PlayerContext'
import { useSpotify } from '../../../contexts/SpotifyContext'

type Song = {
  id: number
  title: string
  artist: string
  url: string
}

function Music() {
  const [songs, setSongs] = useState<Song[]>([])
  const [favoriteIds, setFavoriteIds] = useState<number[]>([])
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const { setActiveSong } = usePlayer()
  const { isConnected, login } = useSpotify()
  const navigate = useNavigate()
  const toast = useToast()
  const userId = localStorage.getItem('tomo_user_id')

  // ログインチェック
  useEffect(() => {
    if (!userId) {
      navigate('/login')
    }
  }, [])

  // 全曲取得
  useEffect(() => {
    fetch(`${API_BASE}/songs`)
      .then((res) => res.json())
      .then((data: Song[]) => {
        setSongs(data)
      })
      .catch((err) => {
        console.error('曲リストの取得に失敗:', err)
        toast({ title: '曲リストの読み込みエラー', status: 'error' })
      })
  }, [])

  // お気に入り曲IDをバックエンドから取得
  useEffect(() => {
    if (!userId) return
    fetch(`${API_BASE}/favorites/${userId}`)
      .then((res) => {
        if (!res.ok) throw new Error('favorites fetch failed')
        return res.json()
      })
      .then((data: { song_ids: number[] }) => {
        setFavoriteIds(data.song_ids || [])
      })
      .catch((err) => {
        console.error('お気に入りの取得に失敗:', err)
      })
  }, [userId])

  const handleLikeSuccess = (songId: number, _total: number, isMilestone: boolean) => {
    if (isMilestone) {
      setFavoriteIds((prev) => {
        if (prev.includes(songId)) return prev
        return [...prev, songId]
      })
    }
  }

  const handleRemoveFavorite = async (songId: number) => {
    setFavoriteIds((prev) => prev.filter((id) => id !== songId))

    if (userId) {
      try {
        const res = await fetch(`${API_BASE}/favorites/${userId}`)
        if (res.ok) {
          const data: { song_ids: number[] } = await res.json()
          setFavoriteIds(data.song_ids || [])
        }
      } catch (err) {
        console.error('お気に入りリストの再取得に失敗:', err)
      }
    }
  }

  const displayedSongs = showFavoritesOnly
    ? songs.filter((song) => favoriteIds.includes(song.id))
    : songs

  if (isConnected) {
    return (
      <VStack spacing={4} align="stretch">
        <HStack justify="space-between" align="center">
          <Heading color="green.500" size="lg">音楽</Heading>
        </HStack>
        <SpotifySection />
      </VStack>
    )
  }

  return (
    <VStack spacing={4} align="stretch">
      <HStack justify="space-between" align="center">
        <Heading color="pink.400" size="lg">
          {showFavoritesOnly ? 'お気に入りの曲' : 'すべての曲'}
        </Heading>
        <HStack spacing={2} align="center">
          <Text fontSize="sm" color="gray.600">
            お気に入りだけ
          </Text>
          <Switch
            colorScheme="pink"
            isChecked={showFavoritesOnly}
            onChange={(e) => setShowFavoritesOnly(e.target.checked)}
          />
        </HStack>
      </HStack>

      <Box
        p={4}
        borderRadius="lg"
        border="1px dashed"
        borderColor="green.200"
        bg="green.50"
        textAlign="center"
      >
        <Text color="gray.600" fontSize="sm" mb={2}>
          Spotifyと連携すると、あなた好みのおすすめ曲が表示されます
        </Text>
        <Button size="sm" colorScheme="green" leftIcon={<FiLogIn />} onClick={login}>
          Spotifyと連携する
        </Button>
      </Box>

      {displayedSongs.length === 0 ? (
        <Box textAlign="center" py={10}>
          <Text color="gray.500">
            {showFavoritesOnly ? 'お気に入り曲はまだありません' : '曲が見つかりません'}
          </Text>
          {showFavoritesOnly && (
            <Text color="gray.400" fontSize="sm" mt={2}>
              曲を5回いいねすると、お気に入りとしてここに表示されます
            </Text>
          )}
        </Box>
      ) : (
        displayedSongs.map((song) => (
          <MusicCard
            key={song.id}
            song={song}
            isFavorite={favoriteIds.includes(song.id)}
            onLikeSuccess={(total, isMilestone) =>
              handleLikeSuccess(song.id, total, isMilestone)
            }
            onRemoveFavorite={handleRemoveFavorite}
            onPlay={(s) => setActiveSong(s)}
          />
        ))
      )}
    </VStack>
  )
}

export default Music
