"use client";

import React from 'react'
import { useEffect, useState, useLayoutEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  Divider,
  Button,
  useToast,
  Input,
  IconButton,
  Textarea,
  CloseButton,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
} from '@chakra-ui/react'
import { FiEdit2, FiCheck } from 'react-icons/fi'
// 型定義がないライブラリのため、型チェックを無効化して読み込む
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { QRCodeSVG } from 'qrcode.react'
import { MusicTypeCard } from '../components/MusicTypeCard'
import { useUser } from '../../../contexts/UserContext'
import { useSpotify } from '../../../contexts/SpotifyContext'
import { API_BASE } from '../../../config'
import { User } from '../../../types'

function Profile() {
  const [userName, setUserName] = useState('')
  const [isEditingName, setIsEditingName] = useState(false)
  const [editingName, setEditingName] = useState('')
  const [userId, setUserId] = useState('')
  const [followers, setFollowers] = useState(0)
  const [following, setFollowing] = useState(0)
  const [tags, setTags] = useState<string[]>([])
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [editingTags, setEditingTags] = useState('')
  const [newTag, setNewTag] = useState('')
  const shareModal = useDisclosure()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const { user, logout, refreshUser } = useUser()
  const { isConnected: isSpotifyConnected, isPremium, login: spotifyLogin, logout: spotifyLogout } = useSpotify()
  const { userId: paramUserId } = useParams()
  const [profileUser, setProfileUser] = useState<User | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)

  // ページ遷移時に必ず一番上にスクロール
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  // レンダリング後にもスクロール位置をリセット
  useEffect(() => {
    const timer = setTimeout(() => {
      window.scrollTo(0, 0)
    }, 0)
    return () => clearTimeout(timer)
  }, [location.pathname])

  // プロフィールコードに対応する絵文字を返す
  const getProfileEmoji = (code: string): string => {
    const emojiMap: { [key: string]: string } = {
      VMPH: '🎸', VMPS: '🎹', VMRH: '🎺', VMRS: '🎚️',
      VAMPH: '🎤', VAMPS: '🎧', VAMRH: '🎼', VAMRS: '💿',
      VRPH: '🎵', VRPS: '🔊', VRRH: '🎶', VRRS: '📻',
      CMPH: '🎸', CMPS: '🎹', CMRH: '🎺', CMRS: '🎚️',
      CAMPH: '🎤', CAMPS: '🎧', CAMRH: '🎼', CAMRS: '💿',
      CRPH: '🎵', CRPS: '🔊', CRRH: '🎶', CRRS: '📻',
    }
    return emojiMap[code] || '🎵'
  }

  const storedId = typeof window !== 'undefined' ? localStorage.getItem('tomo_user_id') : null
  const targetUserId = paramUserId || user?.id || storedId || null
  const isSelf = !paramUserId && targetUserId === user?.id

  const fetchProfile = async (id: string) => {
    try {
      setIsLoadingProfile(true)
      const viewerQuery = user?.id ? `?viewer_id=${user.id}` : ''
      const res = await fetch(`${API_BASE}/users/${id}${viewerQuery}`)
      if (!res.ok) throw new Error('failed to fetch user')
      const data = await res.json()
      setProfileUser(data)
      setUserName(data.name)
      setUserId(data.id)
      setFollowers(data.follower_count ?? 0)
      setFollowing(data.following_count ?? 0)
    } catch (err) {
      console.error(err)
      toast({ title: 'ユーザー情報の取得に失敗しました', status: 'error' })
      navigate('/login')
    } finally {
      setIsLoadingProfile(false)
    }
  }

  // 初期ロード
  useEffect(() => {
    if (!targetUserId) {
      navigate('/login')
      return
    }
    fetchProfile(targetUserId)
    if (isSelf) {
      const savedTags = localStorage.getItem('tomo_profile_tags')
      if (savedTags) {
        try {
          const parsedTags = JSON.parse(savedTags)
          setTags(parsedTags)
          setEditingTags(parsedTags.join(', '))
        } catch (err) {
          console.error('タグ解析エラー:', err)
        }
      }
    }
  }, [targetUserId, isSelf])

  const handleSaveName = async () => {
    if (!editingName.trim()) {
      toast({ title: '名前を入力してください', status: 'warning' })
      return
    }
    if (!userId) return
    try {
      const res = await fetch(`${API_BASE}/users/${userId}/name`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingName.trim() }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setUserName(data.name)
      localStorage.setItem('tomo_user_name', data.name)
      await refreshUser()
      setIsEditingName(false)
      toast({ title: '名前を変更しました', status: 'success' })
    } catch {
      toast({ title: '名前の変更に失敗しました', status: 'error' })
    }
  }

  const handleLogout = () => {
    logout()
    // プロフィールのローカルキャッシュだけ個別管理なので削除
    localStorage.removeItem('tomo_music_profile')
    toast({ title: 'ログアウトしました', status: 'info' })
    navigate('/login', { replace: true })
  }

  const handleFollow = async () => {
    if (!user) {
      toast({ title: 'ログインしてください', status: 'warning' })
      navigate('/login')
      return
    }
    if (!targetUserId) return
    try {
      const res = await fetch(`${API_BASE}/users/${targetUserId}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      })
      if (!res.ok) throw new Error()
      await fetchProfile(targetUserId)
      await refreshUser()
      toast({ title: 'フォローしました', status: 'success' })
    } catch (err) {
      console.error(err)
      toast({ title: 'フォローに失敗しました', status: 'error' })
    }
  }

  const handleUnfollow = async () => {
    if (!user) {
      toast({ title: 'ログインしてください', status: 'warning' })
      navigate('/login')
      return
    }
    if (!targetUserId) return
    try {
      const res = await fetch(`${API_BASE}/users/${targetUserId}/follow`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      })
      if (!res.ok) throw new Error()
      await fetchProfile(targetUserId)
      await refreshUser()
      toast({ title: 'フォロー解除しました', status: 'info' })
    } catch (err) {
      console.error(err)
      toast({ title: '解除に失敗しました', status: 'error' })
    }
  }

  // 編集を保存
  const handleSaveProfile = () => {
    const tagsArray = editingTags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
    localStorage.setItem('tomo_profile_tags', JSON.stringify(tagsArray))

    setTags(tagsArray)
    setIsEditingProfile(false)
    toast({ title: 'プロフィールを保存しました', status: 'success' })
  }

  // 編集をキャンセル
  const handleCancelEdit = () => {
    setEditingTags(tags.join(', '))
    setIsEditingProfile(false)
  }

  // タグ削除
  const handleRemoveTag = (idx: number) => {
    const updatedTags = tags.filter((_, i) => i !== idx)
    setTags(updatedTags)
    localStorage.setItem('tomo_profile_tags', JSON.stringify(updatedTags))
  }

  const profileCode = (isSelf ? user?.music_type?.code : profileUser?.music_type?.code) || ''
  const avatarEmoji = profileCode ? getProfileEmoji(profileCode) : '🎵'

  // QRペイロード
  const qrPayload = isSelf && userId
    ? JSON.stringify({
      userId,
      profileCode,
    })
    : ''

  return (
    <VStack spacing={6}>
      {isLoadingProfile && (
        <Text color="gray.500" fontSize="sm">
          読み込み中...
        </Text>
      )}
      {/* ユーザー情報 */}
      <Box
        width="100%"
        bg="white"
        p={6}
        borderRadius="lg"
        boxShadow="sm"
        border="1px solid"
        borderColor="gray.200"
      >
        <VStack spacing={4} align="start" width="100%">
          <HStack spacing={6} width="100%">
            <Box
              w="72px"
              h="72px"
              borderRadius="full"
              bg="pink.100"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Text fontSize="3xl">{avatarEmoji}</Text>
            </Box>

            <VStack align="start" spacing={2} flex={1}>
              {isSelf && isEditingName ? (
                <HStack spacing={2}>
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    size="sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName()
                      if (e.key === 'Escape') setIsEditingName(false)
                    }}
                  />
                  <IconButton aria-label="保存" icon={<FiCheck />} size="sm" colorScheme="green" onClick={handleSaveName} />
                  <IconButton aria-label="キャンセル" icon={<FiEdit2 />} size="sm" variant="ghost" onClick={() => setIsEditingName(false)} />
                </HStack>
              ) : (
                <HStack spacing={2}>
                  <Heading size="md" color="gray.800">{userName}</Heading>
                  {isSelf && (
                    <IconButton
                      aria-label="名前を編集"
                      icon={<FiEdit2 />}
                      size="xs"
                      variant="ghost"
                      color="gray.400"
                      onClick={() => { setEditingName(userName); setIsEditingName(true) }}
                    />
                  )}
                </HStack>
              )}
              <HStack spacing={4} fontSize="sm">
                <Text color="gray.600">
                  フォロワー数： <strong>{followers}</strong>
                </Text>
                <Text color="gray.600">
                  フォロー数： <strong>{following}</strong>
                </Text>
              </HStack>

              {isSelf ? (
                <HStack spacing={2} mt={2}>
                  <Button size="xs" colorScheme="pink" onClick={shareModal.onOpen}>
                    プロフィールを共有
                  </Button>
                  <Button size="xs" variant="outline" onClick={() => navigate('/follow')}>
                    QRでフォロー
                  </Button>
                </HStack>
              ) : (
                <HStack spacing={2} mt={2}>
                  {profileUser?.viewer_is_following ? (
                    <Button size="sm" variant="outline" colorScheme="pink" onClick={handleUnfollow}>
                      フォロー中
                    </Button>
                  ) : (
                    <Button size="sm" colorScheme="pink" onClick={handleFollow}>
                      フォローする
                    </Button>
                  )}
                </HStack>
              )}
            </VStack>
          </HStack>
        </VStack>
      </Box>

      <Divider />

      {/* Music Type セクション */}

      <VStack spacing={4} align="stretch" width="100%">
        <MusicTypeCard user={isSelf ? user ?? profileUser : profileUser} />
        {isSelf && !user?.music_type && (
          <Button
            colorScheme="pink"
            size="sm"
            alignSelf="center"
            onClick={() => navigate('/survey')}
          >
            診断してみる
          </Button>
        )}
      </VStack>

      {isSelf && (
        <Box
          width="100%"
          bg="white"
          p={6}
          borderRadius="lg"
          boxShadow="sm"
          border="1px solid"
          borderColor="gray.200"
        >
          <VStack spacing={4} align="stretch" width="100%">
            <HStack justify="space-between">
              <Heading size="md" color="gray.700">
                プロフィール
              </Heading>
              <IconButton
                aria-label={isEditingProfile ? '完了' : '編集'}
                icon={isEditingProfile ? <FiCheck /> : <FiEdit2 />}
                colorScheme={isEditingProfile ? 'green' : 'blue'}
                variant="ghost"
                onClick={() => {
                  if (isEditingProfile) {
                    handleSaveProfile()
                  } else {
                    setIsEditingProfile(true)
                  }
                }}
              />
            </HStack>

            {isEditingProfile ? (
              <VStack spacing={3} width="100%">
                <Box width="100%">
                  <Text fontSize="xs" color="gray.600" mb={1}>
                    タグ（カンマ区切りで複数追加可能）
                  </Text>
                  <Textarea
                    value={editingTags}
                    onChange={(e) => setEditingTags(e.target.value)}
                    placeholder=""
                    size="sm"
                    minH="80px"
                    bg="gray.50"
                  />
                </Box>

                <HStack spacing={2} width="100%">
                  <Button
                    size="sm"
                    colorScheme="green"
                    flex={1}
                    onClick={handleSaveProfile}
                  >
                    保存
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    flex={1}
                    onClick={handleCancelEdit}
                  >
                    キャンセル
                  </Button>
                </HStack>
              </VStack>
            ) : (
              <VStack spacing={2} width="100%" align="start">
                <HStack spacing={2} flexWrap="wrap" width="100%">
                  {tags.map((tag, idx) => (
                    <Badge
                      key={idx}
                      variant="solid"
                      colorScheme="blue"
                      display="flex"
                      alignItems="center"
                      gap={1}
                    >
                      # {tag}
                      <CloseButton
                        size="sm"
                        onClick={() => handleRemoveTag(idx)}
                        ml={1}
                      />
                    </Badge>
                  ))}
                </HStack>
                {tags.length === 0 && (
                  <Text fontSize="sm" color="gray.500">
                    タグがありません。編集ボタンから追加してみましょう。
                  </Text>
                )}
              </VStack>
            )}
          </VStack>
        </Box>
      )}

      <Divider />

      {isSelf && (
        <Box
          width="100%"
          bg="white"
          p={6}
          borderRadius="lg"
          boxShadow="sm"
          border="1px solid"
          borderColor="gray.200"
        >
          <VStack spacing={4} align="stretch" width="100%">
            <Heading size="md" color="gray.700">
              Spotify連携
            </Heading>
            {isSpotifyConnected ? (
              <VStack spacing={3} align="stretch">
                <HStack spacing={2}>
                  <Text fontSize="sm" color="gray.700">連携中</Text>
                  <Badge colorScheme={isPremium ? 'green' : 'gray'}>
                    {isPremium ? 'Premium' : 'Free'}
                  </Badge>
                </HStack>
                <Button
                  size="sm"
                  variant="outline"
                  colorScheme="red"
                  onClick={spotifyLogout}
                >
                  連携解除
                </Button>
              </VStack>
            ) : (
              <VStack spacing={2} align="stretch">
                <Text fontSize="sm" color="gray.500">
                  Spotifyと連携すると楽曲の検索・再生ができます。
                </Text>
                <Button
                  size="sm"
                  colorScheme="green"
                  onClick={spotifyLogin}
                >
                  Spotifyと連携する
                </Button>
              </VStack>
            )}
          </VStack>
        </Box>
      )}

      <Divider />

      {isSelf && (
        <Button colorScheme="red" variant="outline" width="100%" onClick={handleLogout}>
          ログアウト
        </Button>
      )}

      {/* QRモーダル */}
      <Modal isOpen={isSelf && shareModal.isOpen} onClose={shareModal.onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>プロフィールQRコード</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {qrPayload ? (
              <VStack spacing={4} align="center">
                <QRCodeSVG value={qrPayload} size={200} />
                <Text fontSize="sm" color="gray.600">
                  このQRコードを友だちの端末で読み取ると、あなたをフォローできます。
                </Text>
              </VStack>
            ) : (
              <Text fontSize="sm" color="gray.600">ユーザー情報が取得できませんでした。</Text>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </VStack>
  )
}

export default Profile