
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
  Image,
  useToast,
} from '@chakra-ui/react'
import { FiPlay, FiPause, FiX, FiChevronDown, FiChevronUp, FiExternalLink } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import LikeButton from './LikeButton'
import { usePlayer } from '../../../contexts/PlayerContext'
import { useSpotify } from '../../../contexts/SpotifyContext'
import { useUser } from '../../../contexts/UserContext'
import { API_BASE, MEDIA_BASE } from '../../../config'

interface MiniPlayerProps {
  onLikeSuccess?: (total: number, isMilestone: boolean) => void
}

const MiniPlayer: React.FC<MiniPlayerProps> = ({ onLikeSuccess }) => {
  const { activeSong: song, setActiveSong, activeSpotifyTrack, setActiveSpotifyTrack } = usePlayer()
  const { currentTrackId, isPlaying: spotifyIsPlaying, playTrack, stopTrack, isPremium, accessToken } = useSpotify()
  const { user, refreshUser } = useUser()
  const navigate = useNavigate()
  const toast = useToast()

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMinimized, setIsMinimized] = useState(false)
  const [spotifyHearts, setSpotifyHearts] = useState<{ id: number }[]>([])

  const handleSpotifyLike = async () => {
    if (!activeSpotifyTrack) return

    const id = Date.now()
    setSpotifyHearts((prev) => [...prev, { id }])
    setTimeout(() => setSpotifyHearts((prev) => prev.filter((h) => h.id !== id)), 1000)

    const userId = user?.id || localStorage.getItem('tomo_user_id')
    if (!userId) return

    try {
      const songRes = await fetch(`${API_BASE}/songs/spotify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spotify_track_id: activeSpotifyTrack.id,
          title: activeSpotifyTrack.title,
          artist: activeSpotifyTrack.artist,
          spotify_url: activeSpotifyTrack.spotify_url,
          album_image: activeSpotifyTrack.album_image,
        }),
      })
      if (!songRes.ok) throw new Error('song registration failed')
      const { song_id } = await songRes.json()

      const likeRes = await fetch(`${API_BASE}/likes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          song_id,
          user_id: userId,
          access_token: accessToken,
          spotify_artist_id: activeSpotifyTrack.artist_id,
        }),
      })
      if (!likeRes.ok) throw new Error('like failed')

      const data = await likeRes.json()
      const oldType = user?.music_type?.code
      await refreshUser()

      if (oldType && data.user_music_type && oldType !== data.user_music_type) {
        if (!toast.isActive('music-type-updated')) {
          toast({
            id: 'music-type-updated',
            title: 'Music Type Updated!',
            description: 'あなたのMusic Typeが変化しました！プロフィールをチェック！',
            status: 'info',
            duration: 5000,
            isClosable: true,
            position: 'top',
          })
        }
      }
    } catch (e) {
      console.error('Like error:', e)
      toast({ title: 'エラーが発生しました', status: 'error', duration: 2000 })
    }
  }

  const isSpotifyMode = !!activeSpotifyTrack

  // 共通情報
  const title = isSpotifyMode ? activeSpotifyTrack.title : song?.title ?? ''
  const artist = isSpotifyMode ? activeSpotifyTrack.artist : song?.artist ?? ''
  const albumImage = isSpotifyMode ? activeSpotifyTrack.album_image : null
  const accentColor = isSpotifyMode ? 'green' : 'pink'

  // 再生状態
  const isCurrentlyPlaying = isSpotifyMode
    ? (currentTrackId === activeSpotifyTrack.id && spotifyIsPlaying)
    : isPlaying

  const onClose = () => {
    if (isSpotifyMode) stopTrack()
    setActiveSong(null)
    setActiveSpotifyTrack(null)
  }

  // フリー曲モード: 曲変更時に自動再生
  useEffect(() => {
    if (!song || isSpotifyMode) return
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

  // Spotify モード: トラックセット時に再生してミニ化
  useEffect(() => {
    if (!activeSpotifyTrack) return
    setIsMinimized(true)
    playTrack(activeSpotifyTrack.id)
  }, [activeSpotifyTrack?.id])

  const handlePlayPause = () => {
    if (isSpotifyMode) {
      playTrack(activeSpotifyTrack!.id)
      return
    }
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => { })
    }
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

  if (!song && !activeSpotifyTrack) return null

  // アルバムアート or プレースホルダー
  const AlbumArt = () =>
    albumImage ? (
      <Image src={albumImage} boxSize="40px" borderRadius="md" objectFit="cover" flexShrink={0} />
    ) : (
      <Box
        boxSize="40px" borderRadius="md" flexShrink={0}
        bg={`${accentColor}.100`}
        display="flex" alignItems="center" justifyContent="center"
        fontSize="18px"
      >
        🎵
      </Box>
    )

  const audioSrc = song
    ? (song.url.startsWith('http') ? song.url : `${MEDIA_BASE || ''}${song.url}`)
    : undefined

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
          boxShadow={`0 -4px 24px rgba(${isSpotifyMode ? '30,215,96' : '255,100,150'},0.15)`}
          px={4}
          py={isMinimized ? 2 : 4}
          transition="padding 0.3s"
          borderRadius={isMinimized ? '2xl' : undefined}
          mx={isMinimized ? 2 : 0}
          mb={isMinimized ? 2 : 0}
          position="relative"
        >
          {isMinimized ? (
            /* ── 最小化モード ────────────────────────────── */
            <HStack spacing={3} align="center">
              {/* 左端: アルバムアート */}
              <AlbumArt />

              {/* 曲名・アーティスト */}
              <Box flex={1} minW={0}>
                <Text fontWeight="bold" fontSize="sm" noOfLines={1}>{title}</Text>
                <Text fontSize="xs" color="gray.500" noOfLines={1}>{artist}</Text>
              </Box>

              {/* 右端コントロール: ❤ → 再生/停止 → 展開 → 閉じる */}
              <HStack spacing={1} flexShrink={0}>
                {/* ハートボタン */}
                {isSpotifyMode ? (
                  <Box position="relative" display="inline-block">
                    <AnimatePresence>
                      {spotifyHearts.map((h) => (
                        <motion.div
                          key={h.id}
                          initial={{ opacity: 1, y: 0, x: 0, scale: 0.5 }}
                          animate={{ opacity: 0, y: -150, x: Math.random() * 60 - 30, scale: 1.3 }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                          style={{ position: 'absolute', top: '10px', left: '10px', fontSize: '24px', pointerEvents: 'none', zIndex: 10 }}
                        >
                          ❤️
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    <motion.div whileTap={{ scale: 0.8 }}>
                      <IconButton
                        icon={<span style={{ fontSize: '16px' }}>❤</span>}
                        aria-label="いいね"
                        isRound size="sm"
                        bg="pink.50" color="pink.400"
                        _hover={{ bg: 'pink.100' }}
                        onClick={handleSpotifyLike}
                      />
                    </motion.div>
                  </Box>
                ) : song ? (
                  <LikeButton
                    songId={song.id}
                    song={song}
                    size="sm"
                    onLikeSuccess={(total, milestone) => onLikeSuccess?.(total, milestone)}
                  />
                ) : null}

                <IconButton
                  aria-label={isCurrentlyPlaying ? '一時停止' : '再生'}
                  icon={isCurrentlyPlaying ? <FiPause /> : <FiPlay />}
                  isRound size="sm"
                  bg={`${accentColor}.400`} color="white"
                  _hover={{ bg: `${accentColor}.500` }}
                  onClick={handlePlayPause}
                />
                <IconButton
                  aria-label="展開"
                  icon={<FiChevronUp />}
                  isRound size="sm" variant="ghost" colorScheme="gray"
                  onClick={() => setIsMinimized(false)}
                />
                <IconButton
                  aria-label="閉じる"
                  icon={<FiX />}
                  isRound size="sm" variant="ghost" colorScheme="gray"
                  onClick={onClose}
                />
              </HStack>
            </HStack>
          ) : (
            /* ── 展開モード ──────────────────────────────── */
            <VStack spacing={3} align="stretch">
              {/* 曲情報ヘッダー */}
              <HStack justify="space-between" align="center">
                <HStack spacing={3} flex={1} minW={0}>
                  <AlbumArt />
                  <Box flex={1} minW={0}>
                    <Text fontWeight="bold" fontSize="md" noOfLines={1}>{title}</Text>
                    <Text fontSize="sm" color="gray.500" noOfLines={1}>{artist}</Text>
                  </Box>
                </HStack>
                <HStack spacing={1} flexShrink={0}>
                  <IconButton
                    aria-label="最小化"
                    icon={<FiChevronDown />}
                    isRound size="sm" variant="ghost" colorScheme="gray"
                    onClick={() => setIsMinimized(true)}
                  />
                  <IconButton
                    aria-label="閉じる"
                    icon={<FiX />}
                    isRound size="sm" variant="ghost" colorScheme="red"
                    onClick={onClose}
                  />
                </HStack>
              </HStack>

              {/* 再生コントロール（フリー曲: シークバーあり / Spotify: ボタンのみ） */}
              {!isSpotifyMode ? (
                <HStack spacing={3} align="center">
                  <IconButton
                    aria-label={isCurrentlyPlaying ? '一時停止' : '再生'}
                    icon={isCurrentlyPlaying ? <FiPause /> : <FiPlay />}
                    isRound size="md"
                    bg={`${accentColor}.300`} color="white"
                    _hover={{ bg: `${accentColor}.400` }}
                    onClick={handlePlayPause}
                    flexShrink={0}
                  />
                  <Text fontSize="xs" color="gray.500" flexShrink={0} w="36px" textAlign="right">
                    {formatTime(currentTime)}
                  </Text>
                  <Slider
                    aria-label="シークバー"
                    min={0} max={duration || 1} value={currentTime}
                    onChange={handleSeek}
                    flex={1} colorScheme={accentColor} focusThumbOnChange={false}
                  >
                    <SliderTrack bg={`${accentColor}.100`}>
                      <SliderFilledTrack bg={`${accentColor}.400`} />
                    </SliderTrack>
                    <SliderThumb boxSize={3} bg={`${accentColor}.500`} />
                  </Slider>
                  <Text fontSize="xs" color="gray.500" flexShrink={0} w="36px">
                    {formatTime(duration)}
                  </Text>
                </HStack>
              ) : (
                <HStack justify="center">
                  <IconButton
                    aria-label={isCurrentlyPlaying ? '一時停止' : '再生'}
                    icon={isCurrentlyPlaying ? <FiPause /> : <FiPlay />}
                    isRound size="lg"
                    bg={`${accentColor}.400`} color="white"
                    _hover={{ bg: `${accentColor}.500` }}
                    onClick={handlePlayPause}
                    isDisabled={isPremium ? false : !activeSpotifyTrack?.preview_url}
                  />
                </HStack>
              )}

              {/* 下部ボタン */}
              <Box display="flex" justifyContent="flex-end" alignItems="center" gap={2}>
                {!isSpotifyMode && song ? (
                  <>
                    <Button
                      size="sm" colorScheme={accentColor} variant="outline"
                      onClick={() => navigate('/share', { state: { song } })}
                    >
                      投稿
                    </Button>
                    <LikeButton
                      songId={song.id}
                      song={song}
                      onLikeSuccess={(total, milestone) => onLikeSuccess?.(total, milestone)}
                    />
                  </>
                ) : (
                  <Button
                    as="a"
                    href={activeSpotifyTrack?.spotify_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="sm" colorScheme={accentColor} variant="outline"
                    leftIcon={<FiExternalLink />}
                  >
                    Spotifyで開く
                  </Button>
                )}
              </Box>
            </VStack>
          )}
        </Box>

        {/* フリー曲用 audio 要素 */}
        {audioSrc && (
          <audio
            ref={audioRef}
            src={audioSrc}
            onTimeUpdate={() => {
              const a = audioRef.current
              if (a) setCurrentTime(a.currentTime)
            }}
            onLoadedMetadata={() => {
              const a = audioRef.current
              if (a) setDuration(a.duration)
            }}
            onEnded={() => { setIsPlaying(false); setCurrentTime(0) }}
            style={{ display: 'none' }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  )
}

export default MiniPlayer
