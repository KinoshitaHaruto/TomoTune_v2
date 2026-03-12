import React from 'react'
import { Box, Heading, Text, Stack, Card, CardBody, Divider, Badge, Button, IconButton, useToast, HStack } from '@chakra-ui/react'
import { FiX } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../../../config'
import type { Song } from '../../../types'

interface MusicCardProps {
  song: Song
  isFavorite: boolean
  onLikeSuccess?: (totalLikes: number, isMilestone: boolean) => void
  onRemoveFavorite?: (songId: number) => void
  onPlay: (song: Song) => void
}

const MusicCard: React.FC<MusicCardProps> = ({ song, isFavorite, onLikeSuccess, onRemoveFavorite, onPlay }) => {
  const navigate = useNavigate()
  const toast = useToast()

  const handleRemoveFavorite = async () => {
    const userId = localStorage.getItem('tomo_user_id')
    if (!userId) {
      toast({ title: 'ログインが必要です', status: 'warning' })
      return
    }

    try {
      const res = await fetch(`${API_BASE}/likes`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          song_id: song.id,
        }),
      })

      if (!res.ok) {
        const errorText = await res.text()
        console.error('Delete failed:', res.status, errorText)
        throw new Error(`削除に失敗しました: ${res.status}`)
      }

      const data = await res.json()

      if (onRemoveFavorite && !data.is_favorite) {
        await onRemoveFavorite(song.id)
      }

      toast({
        title: 'お気に入りから削除しました',
        status: 'info',
        duration: 2000,
      })
    } catch (error) {
      console.error('Remove favorite error:', error)
      toast({
        title: '削除に失敗しました',
        description: error instanceof Error ? error.message : '不明なエラー',
        status: 'error',
        duration: 3000,
      })
    }
  }

  return (
    <Card
      w="100%"
      shadow="sm"
      borderRadius="lg"
      border="1px solid"
      borderColor={isFavorite ? 'pink.300' : 'gray.200'}
      bg={isFavorite ? 'pink.50' : 'white'}
    >
      <CardBody p={4}>
        <Stack spacing={3}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box flex={1}>
              <Heading size="md">{song.title}</Heading>
              <Text color="gray.500" fontSize="sm">
                {song.artist}
              </Text>
            </Box>
            {isFavorite && (
              <HStack spacing={2} ml={2}>
                <Badge colorScheme="pink" fontSize="xs">
                  お気に入り
                </Badge>
                <IconButton
                  aria-label="お気に入りから削除"
                  icon={<FiX />}
                  size="sm"
                  variant="ghost"
                  colorScheme="red"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemoveFavorite()
                  }}
                  _hover={{ bg: 'red.50' }}
                />
              </HStack>
            )}
          </Box>

          <Divider />

          <Box display="flex" alignItems="center" justifyContent="flex-end" gap={2}>
            {song.url ? (
              <>
                <Button
                  size="sm"
                  colorScheme="pink"
                  variant="outline"
                  onClick={() => navigate('/share', { state: { song } })}
                >
                  投稿
                </Button>
                <Button
                  size="sm"
                  colorScheme="pink"
                  variant="solid"
                  leftIcon={<span style={{ fontSize: '14px' }}>▶</span>}
                  onClick={() => onPlay(song)}
                >
                  再生
                </Button>
              </>
            ) : (
              <Text color="red.400" fontSize="sm">
                ※ 音声ファイルがありません
              </Text>
            )}
          </Box>
        </Stack>
      </CardBody>
    </Card>
  )
}

export default MusicCard