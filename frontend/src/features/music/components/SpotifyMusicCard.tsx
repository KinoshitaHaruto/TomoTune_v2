import React, { useState } from 'react'
import {
  Box,
  Heading,
  Text,
  Stack,
  Card,
  CardBody,
  Divider,
  Button,
  HStack,
  Image,
  IconButton,
} from '@chakra-ui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiPlay, FiPause, FiExternalLink } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { useSpotify } from '../../../contexts/SpotifyContext'
import { usePlayer } from '../../../contexts/PlayerContext'
import type { SpotifyTrack } from '../../../types'

export type { SpotifyTrack }

interface SpotifyMusicCardProps {
  track: SpotifyTrack
  onLikeClick?: (trackId: string) => void
}

const formatDuration = (ms: number) => {
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// 飛び出すハートアニメーション（LikeButton と同じ演出）
const FlyingHeart = () => {
  const randomX = Math.random() * 60 - 30
  return (
    <motion.div
      initial={{ opacity: 1, y: 0, x: 0, scale: 0.5 }}
      animate={{ opacity: 0, y: -150, x: randomX, scale: 1.3, rotate: randomX }}
      transition={{ duration: 1, ease: 'easeOut' }}
      style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        fontSize: '24px',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      ❤️
    </motion.div>
  )
}

const SpotifyMusicCard: React.FC<SpotifyMusicCardProps> = ({ track, onLikeClick }) => {
  const navigate = useNavigate()
  const { isConnected, isPremium, currentTrackId, isPlaying } = useSpotify()
  const { setActiveSpotifyTrack } = usePlayer()

  const [hearts, setHearts] = useState<{ id: number }[]>([])
  const isThisPlaying = currentTrackId === track.id && isPlaying
  const isThisActive = currentTrackId === track.id
  const canPlay = isConnected && (isPremium ? true : !!track.preview_url)

  const handleLike = () => {
    const newHeart = { id: Date.now() }
    setHearts((prev) => [...prev, newHeart])
    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h.id !== newHeart.id))
    }, 1000)
    onLikeClick?.(track.id)
  }

  const handlePost = () => {
    navigate('/share', { state: { spotifyTrack: track } })
  }

  return (
    <Card
      w="100%"
      shadow="sm"
      borderRadius="lg"
      border="1px solid"
      borderColor={isThisActive ? 'green.300' : 'gray.200'}
      bg={isThisActive ? 'green.50' : 'white'}
      transition="all 0.2s"
    >
      <CardBody p={4}>
        <Stack spacing={3}>
          {/* アルバムアート + 曲情報 */}
          <HStack align="center" spacing={3}>
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
              <Heading size="md" noOfLines={1}>{track.title}</Heading>
              <Text color="gray.500" fontSize="sm" noOfLines={1}>{track.artist}</Text>
              <Text color="gray.400" fontSize="xs">{formatDuration(track.duration_ms)}</Text>
            </Box>
          </HStack>

          <Divider />

          {/* ボタン群 */}
          <HStack justify="space-between" align="center">
            {/* ハートボタン */}
            <Box position="relative" display="inline-block">
              <AnimatePresence>
                {hearts.map((heart) => (
                  <FlyingHeart key={heart.id} />
                ))}
              </AnimatePresence>
              <motion.div whileTap={{ scale: 0.8 }}>
                <IconButton
                  icon={<span style={{ fontSize: '20px', marginTop: '2px' }}>❤</span>}
                  aria-label="いいね"
                  isRound
                  bg="pink.50"
                  color="pink.400"
                  size="md"
                  _hover={{ bg: 'pink.100' }}
                  onClick={handleLike}
                />
              </motion.div>
            </Box>

            {/* 右側ボタン群 */}
            <HStack spacing={2}>
              <Button
                as="a"
                href={track.spotify_url}
                target="_blank"
                rel="noopener noreferrer"
                size="sm"
                colorScheme="green"
                variant="outline"
                leftIcon={<FiExternalLink />}
              >
                Spotifyで開く
              </Button>
              <Button
                size="sm"
                colorScheme="pink"
                variant="outline"
                onClick={handlePost}
              >
                投稿
              </Button>
              <Button
                size="sm"
                colorScheme="green"
                variant="solid"
                leftIcon={isThisPlaying ? <FiPause /> : <FiPlay />}
                onClick={() => setActiveSpotifyTrack(track)}
                isDisabled={!canPlay}
              >
                {isThisPlaying ? '停止' : '再生'}
              </Button>
            </HStack>
          </HStack>
        </Stack>
      </CardBody>
    </Card>
  )
}

export default SpotifyMusicCard
