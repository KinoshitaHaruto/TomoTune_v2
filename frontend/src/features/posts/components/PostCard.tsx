import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Heading,
  Text,
  VStack,
  Card,
  CardBody,
  HStack,
  Badge,
  Divider,
  Button,
  Tag,
  IconButton,
  Image,
  Link,
  Tooltip,
} from '@chakra-ui/react'
import { BiComment } from 'react-icons/bi'
import { FiPlay } from 'react-icons/fi'
import { SiSpotify } from 'react-icons/si'
import { MEDIA_BASE } from '../../../config'
import { usePlayer } from '../../../contexts/PlayerContext'
import { useSpotify } from '../../../contexts/SpotifyContext'
import type { Post, SpotifyTrack } from '../../../types'

interface PostCardProps {
  post: Post
  currentUserId?: string
  onOpenComments?: (post: Post) => void
}

const PostCard: React.FC<PostCardProps> = ({ post, currentUserId, onOpenComments }) => {
  const { setActiveSong, setActiveSpotifyTrack } = usePlayer()
  const { isConnected, isPremium } = useSpotify()
  const isSpotify = !!post.song.spotify_track_id
  const date = new Date(post.created_at)
  const isMine = currentUserId && post.user && post.user.id === currentUserId
  const commentCount = post.comments ? post.comments.length : 0
  const navigate = useNavigate()

  const userTypeLabel = useMemo(() => {
    if (!post.user?.music_type) return null
    return `${post.user.music_type.code} ${post.user.music_type.name ?? ''}`.trim()
  }, [post.user?.music_type])

  const handlePlay = () => {
    if (isSpotify) {
      const track: SpotifyTrack = {
        id: post.song.spotify_track_id!,
        title: post.song.title,
        artist: post.song.artist,
        album: '',
        album_image: post.song.album_image ?? null,
        spotify_url: post.song.url,
        duration_ms: 0,
        preview_url: null,
      }
      setActiveSpotifyTrack(track)
    } else {
      const url = post.song.url.startsWith('http')
        ? post.song.url
        : `${MEDIA_BASE || ''}${post.song.url}`
      setActiveSong({ ...post.song, url })
    }
  }

  // Spotify再生ボタンの状態
  // not connected → Spotifyロゴ＋連携誘導トースト
  // connected, not premium → disabled + tooltip
  // connected + premium → 通常の再生ボタン
  const renderPlayButton = () => {
    if (!isSpotify) {
      return (
        <IconButton
          aria-label="再生"
          icon={<FiPlay size={18} />}
          isRound
          size="md"
          colorScheme="pink"
          variant="solid"
          flexShrink={0}
          onClick={handlePlay}
        />
      )
    }
    if (!isConnected) {
      return (
        <Tooltip label="Spotifyと連携すると再生できます" placement="top" hasArrow>
          <IconButton
            aria-label="Spotifyと連携して再生"
            icon={<SiSpotify size={20} />}
            isRound
            size="md"
            colorScheme="green"
            variant="outline"
            flexShrink={0}
            onClick={() => navigate('/profile')}
          />
        </Tooltip>
      )
    }
    if (!isPremium) {
      return (
        <Tooltip label="Spotify Premiumが必要です" placement="top" hasArrow>
          <IconButton
            aria-label="再生不可"
            icon={<SiSpotify size={20} />}
            isRound
            size="md"
            colorScheme="green"
            variant="outline"
            flexShrink={0}
            isDisabled
          />
        </Tooltip>
      )
    }
    return (
      <IconButton
        aria-label="再生"
        icon={<FiPlay size={18} />}
        isRound
        size="md"
        colorScheme="green"
        variant="solid"
        flexShrink={0}
        onClick={handlePlay}
      />
    )
  }

  return (
    <Card
      w="100%"
      shadow="sm"
      borderRadius="lg"
      border="1px solid"
      borderColor={isMine ? 'purple.300' : 'gray.200'}
      bg={isMine ? 'purple.50' : 'white'}
    >
      <CardBody>
        <VStack align="stretch" spacing={3}>
          <HStack justify="space-between" align="center">
            <Box>
              <Text fontSize="sm" color="gray.500">
                投稿者
              </Text>
              <HStack spacing={2} align="center">
                <Heading size="sm" color="gray.800">
                  {post.user?.name ?? 'Unknown'}
                </Heading>
                {post.user?.id && !isMine && (
                  <Button size="xs" variant="outline" onClick={() => navigate(`/profile/${post.user?.id}`)}>
                    プロフィールを見る
                  </Button>
                )}
              </HStack>
              {userTypeLabel && (
                <Tag size="sm" colorScheme="purple" mt={1} variant="subtle">
                  {userTypeLabel}
                </Tag>
              )}
            </Box>
            <Badge colorScheme="pink" fontSize="xs">
              {date.toLocaleString()}
            </Badge>
          </HStack>

          <Divider />

          {/* 曲情報 + 再生ボタン */}
          <HStack justify="space-between" align="center">
            <Box flex={1} minW={0}>
              <Text fontSize="xs" color="gray.500" mb={1}>
                曲
              </Text>
              {isSpotify ? (
                <HStack spacing={3} align="center">
                  {post.song.album_image && (
                    <Image
                      src={post.song.album_image}
                      alt="album art"
                      boxSize="48px"
                      borderRadius="md"
                      objectFit="cover"
                      flexShrink={0}
                    />
                  )}
                  <Box minW={0}>
                    <Text fontWeight="bold" noOfLines={1}>{post.song.title}</Text>
                    <Text fontSize="sm" color="gray.500" noOfLines={1}>
                      {post.song.artist}
                    </Text>
                    <HStack spacing={2} mt={0.5}>
                      <Badge colorScheme="green" fontSize="xs">
                        Spotify
                      </Badge>
                      <Link
                        href={post.song.url}
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
                  <Text fontWeight="bold" noOfLines={1}>{post.song.title}</Text>
                  <Text fontSize="sm" color="gray.500" noOfLines={1}>
                    {post.song.artist}
                  </Text>
                </>
              )}
            </Box>

            {/* 再生ボタン */}
            {renderPlayButton()}
          </HStack>

          {/* 投稿コメント */}
          <Box
            bg={isMine ? 'purple.100' : 'gray.100'}
            borderRadius="lg"
            px={4}
            py={3}
          >
            <Text fontSize="xs" color="gray.500" mb={1}>
              投稿コメント
            </Text>
            <Text fontSize="md" color="gray.800">
              {post.comment}
            </Text>
          </Box>

          <Divider />

          <HStack justify="space-between" align="center">
            <HStack spacing={2}>
              <Text fontSize="sm" fontWeight="bold">
                コメント
              </Text>
              <Badge colorScheme="pink" fontSize="xs">
                {commentCount}件
              </Badge>
            </HStack>
            <IconButton
              aria-label="コメントを開く"
              icon={<BiComment size={20} />}
              bg="#fff6f6cf"
              color="#ff78b5ff"
              _hover={{ bg: '#ffe5f0' }}
              onClick={() => onOpenComments?.(post)}
            />
          </HStack>
        </VStack>
      </CardBody>
    </Card>
  )
}

export default PostCard
