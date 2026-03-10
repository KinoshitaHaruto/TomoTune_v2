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
} from '@chakra-ui/react'
import { API_BASE } from '../config'
import type { Song } from '../types'

interface ShareLocationState {
  song?: Song
}

function Share() {
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const state = (location.state || {}) as ShareLocationState
  const song = state.song

  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const userId = localStorage.getItem('tomo_user_id')

  const handleSubmit = async () => {
    if (!userId) {
      toast({ title: 'ログインが必要です', status: 'warning' })
      navigate('/login')
      return
    }
    if (!song) {
      toast({ title: '曲情報が見つかりません', status: 'error' })
      return
    }
    if (!comment.trim()) {
      toast({ title: 'コメントを入力してください', status: 'warning' })
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          song_id: song.id,
          comment: comment.trim(),
        }),
      })

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

  if (!song) {
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

  const audioSrc = song.url.startsWith('http') ? song.url : `${API_BASE || ''}${song.url}`

  return (
    <VStack spacing={6} align="stretch">
      <Heading color="pink.400" size="lg">
        音楽をシェア
      </Heading>

      {/* 曲情報表示（投稿ボタン・ハートなしの簡易カード） */}
      <Box
        border="1px solid"
        borderColor="gray.200"
        borderRadius="lg"
        p={4}
        bg="gray.50"
      >
        <Text fontSize="xs" color="gray.500" mb={1}>
          投稿する曲
        </Text>
        <Heading size="md">{song.title}</Heading>
        <Text color="gray.500" fontSize="sm">
          {song.artist}
        </Text>
        <Box mt={3}>
          <audio
            controls
            src={audioSrc}
            style={{ width: '100%' }}
            controlsList="nodownload noplaybackrate"
          >
            オーディオ非対応
          </audio>
        </Box>
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
        colorScheme="pink"
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
