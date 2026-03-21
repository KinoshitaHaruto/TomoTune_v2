import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Box,
  Heading,
  Text,
  VStack,
  Textarea,
  Button,
  useToast,
  Image,
  HStack,
  Badge,
  Link,
} from '@chakra-ui/react'
import { API_BASE, MEDIA_BASE } from '../../../config'
import type { Song, SpotifyTrack } from '../../../types'

interface ShareLocationState {
  song?: Song
  spotifyTrack?: SpotifyTrack
}

function Share() {
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const state = (location.state || {}) as ShareLocationState
  const song = state.song
  const spotifyTrack = state.spotifyTrack

  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const userId = localStorage.getItem('tomo_user_id')

  const handleSubmit = async () => {
    if (!userId) {
      toast({ title: 'ログインが必要です', status: 'warning' })
      navigate('/login')
      return
    }
    if (!song && !spotifyTrack) {
      toast({ title: '曲情報が見つかりません', status: 'error' })
      return
    }
    if (!comment.trim()) {
      toast({ title: 'コメントを入力してください', status: 'warning' })
      return
    }

    setIsSubmitting(true)
    try {
      let res: Response

      if (spotifyTrack) {
        res = await fetch(`${API_BASE}/posts/from-spotify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            comment: comment.trim(),
            spotify_track_id: spotifyTrack.id,
            title: spotifyTrack.title,
            artist: spotifyTrack.artist,
            spotify_url: spotifyTrack.spotify_url,
            album_image: spotifyTrack.album_image,
          }),
        })
      } else {
        res = await fetch(`${API_BASE}/posts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            song_id: song!.id,
            comment: comment.trim(),
          }),
        })
      }

      if (!res.ok) {
        throw new Error('投稿に失敗しました')
      }

      toast({ title: '投稿しました！', status: 'success' })
      navigate('/')
    } catch (e) {
      console.error(e)
      toast({ title: '投稿に失敗しました', status: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!song && !spotifyTrack) {
    return (
      <VStack spacing={4}>
        <Heading color="pink.400" size="md">
          音楽をシェア
        </Heading>
        <Text color="gray.500" fontSize="sm">
          曲が選択されていません。Musicページから「投稿」ボタンで曲を選んでください。
        </Text>
        <Button colorScheme="pink" onClick={() => navigate('/music')}>
          曲一覧へ戻る
        </Button>
      </VStack>
    )
  }

  return (
    <VStack spacing={6} align="stretch">
      <Heading color="pink.400" size="lg">
        音楽をシェア
      </Heading>

      {/* 曲情報表示 */}
      <Box
        border="1px solid"
        borderColor={spotifyTrack ? 'green.300' : 'gray.200'}
        borderRadius="lg"
        p={4}
        bg={spotifyTrack ? 'green.50' : 'gray.50'}
      >
        <Text fontSize="xs" color="gray.500" mb={1}>
          投稿する曲
        </Text>

        {spotifyTrack ? (
          <HStack spacing={3} align="start">
            {spotifyTrack.album_image && (
              <Image
                src={spotifyTrack.album_image}
                alt="album art"
                boxSize="64px"
                borderRadius="md"
                objectFit="cover"
                flexShrink={0}
              />
            )}
            <Box flex={1}>
              <Heading size="md">{spotifyTrack.title}</Heading>
              <Text color="gray.500" fontSize="sm">
                {spotifyTrack.artist}
              </Text>
              <HStack mt={1} spacing={2}>
                <Badge colorScheme="green" fontSize="xs">
                  Spotify
                </Badge>
                <Link
                  href={spotifyTrack.spotify_url}
                  isExternal
                  fontSize="xs"
                  color="green.600"
                >
                  Spotifyで開く
                </Link>
              </HStack>
            </Box>
          </HStack>
        ) : (
          <>
            <Heading size="md">{song!.title}</Heading>
            <Text color="gray.500" fontSize="sm">
              {song!.artist}
            </Text>
            <Box mt={3}>
              <audio
                controls
                src={song!.url.startsWith('http') ? song!.url : `${MEDIA_BASE || ''}${song!.url}`}
                style={{ width: '100%' }}
                controlsList="nodownload noplaybackrate"
              >
                オーディオ非対応
              </audio>
            </Box>
          </>
        )}
      </Box>

      {/* コメント入力 */}
      <Box>
        <Text fontSize="sm" color="gray.600" mb={2}>
          この曲について一言コメントを残そう
        </Text>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="例）深夜に聴くと落ち着く / 歌詞が刺さる / テンション爆上がり…"
          minH="120px"
          bg="white"
        />
      </Box>

      <Button
        colorScheme={spotifyTrack ? 'green' : 'pink'}
        width="100%"
        isLoading={isSubmitting}
        loadingText="投稿中..."
        onClick={handleSubmit}
      >
        投稿する
      </Button>
    </VStack>
  )
}

export default Share
