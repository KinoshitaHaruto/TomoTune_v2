import React, { useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Box,
  Text,
  IconButton,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  HStack,
  VStack,
  Button,
} from '@chakra-ui/react'
import { FiPlay, FiPause, FiX, FiChevronDown, FiChevronUp } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import LikeButton from './LikeButton'
import { usePlayer } from '../../../contexts/PlayerContext'
import { MEDIA_BASE } from '../../../config'

interface MiniPlayerProps {
  isFavorite?: boolean
  onLikeSuccess?: (total: number, isMilestone: boolean) => void
}

const MiniPlayer: React.FC<MiniPlayerProps> = ({ isFavorite = false, onLikeSuccess }) => {
  const { activeSong: song, setActiveSong } = usePlayer()
  const onClose = () => setActiveSong(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMinimized, setIsMinimized] = useState(false)
  const navigate = useNavigate()

  // 曲が変わったとき・表示されたときに自動再生
  useEffect(() => {
    if (!song) return
    setCurrentTime(0)
    setDuration(0)
    setIsPlaying(false)
    setIsMinimized(true)

    const audio = audioRef.current
    if (audio) {
      audio.load()
      audio.play().then(() => setIsPlaying(true)).catch(() => { })
    }
  }, [song?.id])

  const handlePlayPause = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => { })
    }
  }

  const handleTimeUpdate = () => {
    const audio = audioRef.current
    if (!audio) return
    setCurrentTime(audio.currentTime)
  }

  const handleLoadedMetadata = () => {
    const audio = audioRef.current
    if (!audio) return
    setDuration(audio.duration)
  }

  const handleEnded = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const handleSeek = (val: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = val
    setCurrentTime(val)
  }

  const formatTime = (sec: number) => {
    if (isNaN(sec)) return '0:00'
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const handleShare = () => {
    if (song) navigate('/share', { state: { song } })
  }

  if (!song) return null

  const audioSrc = song.url.startsWith('http') ? song.url : `${MEDIA_BASE || ''}${song.url}`

  return (
    <AnimatePresence>
      <motion.div
        key="mini-player"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{ width: '100%' }}
      >
        <Box
          bg="white"
          boxShadow="0 -4px 24px rgba(255,100,150,0.15)"
          px={4}
          py={isMinimized ? 2 : 4}
          transition="padding 0.3s"
          borderRadius={isMinimized ? '2xl' : undefined}
          mx={isMinimized ? 2 : 0}
          mb={isMinimized ? 2 : 0}
          position="relative"
        >
          {/* 最小化時: コンパクト表示 */}
          {isMinimized ? (
            <>
              {/* 右上: バツボタン */}
              <IconButton
                aria-label="閉じる"
                icon={<FiX />}
                isRound
                size="xs"
                variant="ghost"
                colorScheme="gray"
                onClick={onClose}
                position="absolute"
                top={1}
                right={1}
              />

              <HStack justify="space-between" align="center" pr={6}>
                <HStack spacing={3}>
                  {/* 再生/停止ボタン */}
                  <IconButton
                    aria-label={isPlaying ? '一時停止' : '再生'}
                    icon={isPlaying ? <FiPause /> : <FiPlay />}
                    isRound
                    size="sm"
                    bg="pink.400"
                    color="white"
                    _hover={{ bg: 'pink.500' }}
                    onClick={handlePlayPause}
                  />
                  <Box>
                    <Text fontWeight="bold" fontSize="sm" noOfLines={1} maxW="140px">
                      {song.title}
                    </Text>
                    <Text fontSize="xs" color="gray.500" noOfLines={1}>
                      {song.artist}
                    </Text>
                  </Box>
                </HStack>

                <HStack spacing={1}>
                  {/* 展開ボタン */}
                  <IconButton
                    aria-label="展開"
                    icon={<FiChevronUp />}
                    isRound
                    size="sm"
                    variant="ghost"
                    colorScheme="gray"
                    onClick={() => setIsMinimized(false)}
                  />
                  {/* ❤ ハートボタン */}
                  <LikeButton
                    songId={song.id}
                    song={song}
                    onLikeSuccess={(total, milestone) => onLikeSuccess?.(total, milestone)}
                  />
                </HStack>
              </HStack>
            </>
          ) : (
            /* 展開時: フルプレイヤー */
            <VStack spacing={3} align="stretch">
              {/* 曲情報 + 上部ボタン群 */}
              <HStack justify="space-between" align="center">
                <Box flex={1} minW={0}>
                  <Text fontWeight="bold" fontSize="md" noOfLines={1}>
                    {song.title}
                  </Text>
                  <Text fontSize="sm" color="gray.500" noOfLines={1}>
                    {song.artist}
                  </Text>
                </Box>
                <HStack spacing={1} flexShrink={0}>
                  {/* 最小化ボタン */}
                  <IconButton
                    aria-label="最小化"
                    icon={<FiChevronDown />}
                    isRound
                    size="sm"
                    variant="ghost"
                    colorScheme="gray"
                    onClick={() => setIsMinimized(true)}
                  />
                  {/* 閉じるボタン */}
                  <IconButton
                    aria-label="閉じる"
                    icon={<FiX />}
                    isRound
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    onClick={onClose}
                  />
                </HStack>
              </HStack>

              {/* 再生コントロール + シークバー */}
              <HStack spacing={3} align="center">
                <IconButton
                  aria-label={isPlaying ? '一時停止' : '再生'}
                  icon={isPlaying ? <FiPause /> : <FiPlay />}
                  isRound
                  size="md"
                  bg="pink.300"
                  color="white"
                  _hover={{ bg: 'pink.400' }}
                  onClick={handlePlayPause}
                  flexShrink={0}
                />
                <Text fontSize="xs" color="gray.500" flexShrink={0} w="36px" textAlign="right">
                  {formatTime(currentTime)}
                </Text>
                <Slider
                  aria-label="シークバー"
                  min={0}
                  max={duration || 1}
                  value={currentTime}
                  onChange={handleSeek}
                  flex={1}
                  colorScheme="pink"
                  focusThumbOnChange={false}
                >
                  <SliderTrack bg="pink.100">
                    <SliderFilledTrack bg="pink.400" />
                  </SliderTrack>
                  <SliderThumb boxSize={3} bg="pink.500" />
                </Slider>
                <Text fontSize="xs" color="gray.500" flexShrink={0} w="36px">
                  {formatTime(duration)}
                </Text>
              </HStack>

              {/* 右下固定: 投稿 + ❤ ハートボタン */}
              <Box display="flex" justifyContent="flex-end" alignItems="center" gap={2}>
                <Button
                  size="sm"
                  colorScheme="pink"
                  variant="outline"
                  onClick={handleShare}
                >
                  投稿
                </Button>
                <LikeButton
                  songId={song.id}
                  song={song}
                  onLikeSuccess={(total, milestone) => onLikeSuccess?.(total, milestone)}
                />
              </Box>
            </VStack>
          )}

          {/* 非表示の audio 要素 */}
          <audio
            ref={audioRef}
            src={audioSrc}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
            style={{ display: 'none' }}
          />
        </Box>
      </motion.div>
    </AnimatePresence>
  )
}

export default MiniPlayer
