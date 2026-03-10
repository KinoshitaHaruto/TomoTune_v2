import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Heading,
  Text,
  VStack,
  Box,
  Button,
  HStack,
  Tag,
  Textarea,
  useToast,
} from '@chakra-ui/react'

import PostCard from '../components/PostCard'
import { API_BASE } from '../config'
import type { Post, Comment } from '../types'
function Home() {
  const navigate = useNavigate()
  const toast = useToast()

  const [userId, setUserId] = useState<string | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')

  // ログイン確認
  useEffect(() => {
    const storedId = localStorage.getItem('tomo_user_id')
    if (!storedId) {
      navigate('/login')
    } else {
      setUserId(storedId)
    }
  }, [])

  // 投稿データ取得
  useEffect(() => {
    fetch(`${API_BASE}/posts`)
      .then((res) => res.json())
      .then((data) => setPosts(data))
  }, [])

  // コメント表示開始
  const handleOpenComments = (post: Post) => {
    setSelectedPost(post)
    setComments(post.comments ?? [])
    setCommentText('')
    // 最新のコメントを取得して表示を同期
    fetchComments(post.id)
  }

  const fetchComments = async (postId: number) => {
    try {
      const res = await fetch(`${API_BASE}/posts/${postId}/comments`)
      if (!res.ok) throw new Error('Failed to fetch comments')
      const data = await res.json()
      setComments(data)
      // posts一覧側のコメント件数も更新しておく
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comments: data } : p
        )
      )
    } catch (e) {
      console.error(e)
      toast({ title: 'コメントの再取得に失敗しました', status: 'error' })
    }
  }

  const handleAddComment = async () => {
    if (!selectedPost) return
    if (!userId) {
      alert('コメントするにはログインしてください')
      return
    }
    if (!commentText.trim()) return

    const res = await fetch(`${API_BASE}/posts/${selectedPost.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, content: commentText.trim() }),
    })

    if (!res.ok) {
      alert('コメントの送信に失敗しました')
      return
    }

    const newComment = (await res.json()) as Comment
    // いったん追加し、直後にサーバーデータで再同期する
    setComments((prev) => [...prev, newComment])
    await fetchComments(selectedPost.id)
    setCommentText('')
  }

  return (
    <Box position="relative" pb={selectedPost ? 24 : 0}>
      <VStack spacing={8} align="stretch">

        {/* ------------------- 投稿一覧 ------------------- */}
        <Heading size="md" color="gray.700">みんなの投稿</Heading>
        <VStack spacing={4} align="stretch">
          {posts.length === 0 ? (
            <Text color="gray.500">まだ投稿はありません。</Text>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={userId ?? undefined}
                onOpenComments={handleOpenComments}
              />
            ))
          )}
        </VStack>

      </VStack>

      {selectedPost && (
        <Box
          position="fixed"
          bottom={0}
          left="50%"
          transform="translateX(-50%)"
          width="100%"
          maxW="480px"
          bg="white"
          borderTopRadius="24px"
          boxShadow="0 -4px 12px rgba(0,0,0,0.15)"
          maxH="55vh"
          overflowY="auto"
          zIndex={2000}
          p={4}
        >
          <HStack justify="space-between" mb={3}>
            <Box>
              <Text fontSize="sm" color="gray.500">投稿者</Text>
              <Text fontWeight="bold">{selectedPost.user?.name ?? 'Unknown'}</Text>
            </Box>
            <Text fontSize="xs" color="gray.500">
              {new Date(selectedPost.created_at).toLocaleString()}
            </Text>
          </HStack>

          <Box mb={3}>
            <Text fontSize="xs" color="gray.500">曲</Text>
            <Text fontWeight="bold">{selectedPost.song.title}</Text>
            <Text fontSize="sm" color="gray.500">{selectedPost.song.artist}</Text>
          </Box>

          <VStack align="stretch" spacing={3}>
            {comments.length === 0 ? (
              <Text fontSize="sm" color="gray.500">まだコメントはありません。</Text>
            ) : (
              <VStack align="stretch" spacing={2}>
                {comments.map((c) => (
                  <Box key={c.id} p={2} bg="gray.50" borderRadius="md" border="1px solid" borderColor="gray.100">
                    <HStack justify="space-between" mb={1}>
                      <Box>
                        <Text fontSize="sm" fontWeight="semibold">
                          {c.user?.name ?? 'Unknown'}
                        </Text>
                        {c.user?.music_type?.code && (
                          <Tag size="xs" colorScheme="purple" variant="subtle" mt={1}>
                            {c.user.music_type.code}
                          </Tag>
                        )}
                      </Box>
                      <Text fontSize="xs" color="gray.500">
                        {new Date(c.created_at).toLocaleString()}
                      </Text>
                    </HStack>
                    <Text fontSize="sm" color="gray.800">
                      {c.content}
                    </Text>
                  </Box>
                ))}
              </VStack>
            )}

            <Textarea
              placeholder="投稿へのコメントを書く"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              size="sm"
              bg="gray.50"
            />
            <Button colorScheme="pink" size="sm" onClick={handleAddComment} isDisabled={!userId}>
              コメントを送信
            </Button>
            {!userId && (
              <Text fontSize="xs" color="gray.500">
                コメントするにはログインしてください。
              </Text>
            )}

            <Button mt={2} w="100%" onClick={() => setSelectedPost(null)}>
              閉じる
            </Button>
          </VStack>
        </Box>
      )}
    </Box>
  )
}

export default Home
