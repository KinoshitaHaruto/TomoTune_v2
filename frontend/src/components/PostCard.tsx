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
  Textarea,
  Button,
  Stack,
  Tag,
  IconButton,
} from '@chakra-ui/react'
import { BiComment } from 'react-icons/bi'
import { API_BASE } from '../config'
import type { Post, Comment } from '../types'

interface PostCardProps {
  post: Post
  currentUserId?: string
  onOpenComments?: (post: Post) => void
}

const PostCard: React.FC<PostCardProps> = ({ post, currentUserId, onOpenComments }) => {
  const audioSrc = post.song.url.startsWith('http') ? post.song.url : `${API_BASE || ''}${post.song.url}`
  const date = new Date(post.created_at)
  const isMine = currentUserId && post.user && post.user.id === currentUserId
  const commentCount = post.comments ? post.comments.length : 0
  const navigate = useNavigate()

  const userTypeLabel = useMemo(() => {
    if (!post.user?.music_type) return null
    return `${post.user.music_type.code} ${post.user.music_type.name ?? ''}`.trim()
  }, [post.user?.music_type])

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

          <Box>
            <Text fontSize="xs" color="gray.500" mb={1}>
              曲
            </Text>
            <Text fontWeight="bold">{post.song.title}</Text>
            <Text fontSize="sm" color="gray.500">
              {post.song.artist}
            </Text>
          </Box>

          <Box>
            <audio
              controls
              src={audioSrc}
              style={{ width: '100%' }}
              controlsList="nodownload noplaybackrate"
            >
              オーディオ非対応
            </audio>
          </Box>

          <Box>
            <Text fontSize="xs" color="gray.500" mb={1}>
              投稿コメント
            </Text>
            <Text fontSize="sm" color="gray.800">
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