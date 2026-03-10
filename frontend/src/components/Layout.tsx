import React, { useRef, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { 
  Box, 
  Container, 
  Heading, 
  Text, 
  HStack, 
  IconButton, 
  useToast,
  VStack,
  useDisclosure,
  Divider,
  CloseButton,
} from '@chakra-ui/react'
import { FiHome, FiPlus, FiMusic, FiUser, FiMenu } from 'react-icons/fi'
import { useUser } from '../contexts/UserContext'

const Layout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const { user, logout } = useUser()
  const contentRef = useRef<HTMLDivElement>(null)

  // ページ遷移時にコンテンツエリアのスクロール位置をリセット
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0
    }
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    toast({ title: 'ログアウトしました', status: 'info' })
    navigate("/login")
  }

  // ナビゲーションアイテム
  const navItems = [
    { icon: FiHome, label: 'ホーム', path: '/' },
    { icon: FiPlus, label: '投稿', path: '/share' },
    { icon: FiMusic, label: '曲', path: '/music' },
    { icon: FiUser, label: 'プロフ', path: '/profile' },
  ]

  const isActive = (path: string) => location.pathname === path
  return (
    // 全体の背景
    <Box bg="gray.100" minH="100vh" py={10} px={4}>
    
      {/* スマホ枠 (固定) */}
      <Container 
        maxW="480px"       
        bg="white"         
        h="740px"          // 固定高さ（スマホサイズ）
        borderRadius="2xl" 
        boxShadow="xl"     
        p={0}              
        overflow="hidden"
        display="flex"
        flexDirection="column"
        position="relative"
      >
        {/* ヘッダー (固定) - グラデーション背景 */}
        <Box
          bgGradient="linear(to-r, purple.500, pink.400, red.400)"
          p={4}
          textAlign="center"
          flexShrink={0}
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          color="white"
        >
          <Box flex={1} textAlign="left">
            <IconButton
              aria-label="メニュー"
              icon={<FiMenu />}
              bg="transparent"
              color="white"
              _hover={{ bg: 'whiteAlpha.200' }}
              onClick={onOpen}
            />
          </Box>

          <Box flex={2} textAlign="center">
            <Heading size="lg" color="white">
              TomoTune
            </Heading>
          </Box>

          <Box flex={1} />
        </Box>

        {/* コンテンツエリア */}
        <Box 
          ref={contentRef}
          flex={1} 
          overflowY="auto" 
          p={6}
          // スクロールバーを隠すスタイル
          css={{ '&::-webkit-scrollbar': { display: 'none' } }}
        >
          {/* outletにpageを差し込む */}
          <Outlet />
        </Box>

        {/* フッター (固定) - グラデーション背景 + ナビゲーション */}
        <Box
          bgGradient="linear(to-r, purple.500, pink.400, blue.400)"
          p={4}
          flexShrink={0}
        >
          <HStack
            spacing={0}
            justify="space-around"
            color="white"
          >
            {navItems.map((item) => (
              <IconButton
                key={item.path}
                aria-label={item.label}
                icon={<item.icon size={28} />}
                bg={isActive(item.path) ? 'whiteAlpha.300' : 'transparent'}
                color="white"
                fontSize="24px"
                _hover={{ bg: 'whiteAlpha.200' }}
                onClick={() => navigate(item.path)}
                borderRadius="full"
                size="lg"
              />
            ))}
          </HStack>
        </Box>

        {/* ハンバーガーメニューのサイドパネル（スマホ枠内に表示） */}
        {/* オーバーレイ */}
        {isOpen && (
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            bg="blackAlpha.600"
            zIndex={998}
            onClick={onClose}
          />
        )}

        {/* サイドパネル */}
        <Box
          position="absolute"
          top={0}
          left={0}
          bottom={0}
          w="280px"
          bg="white"
          zIndex={999}
          transform={isOpen ? "translateX(0)" : "translateX(-100%)"}
          transition="transform 0.3s ease-in-out"
          boxShadow="xl"
          display="flex"
          flexDirection="column"
        >
          <Box
            p={4}
            bgGradient="linear(to-r, purple.500, pink.400, red.400)"
            color="white"
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Heading size="md">メニュー</Heading>
            <CloseButton
              onClick={onClose}
              color="white"
              _hover={{ bg: 'whiteAlpha.200' }}
            />
          </Box>

          <Box
            flex={1}
            overflowY="auto"
            p={4}
            css={{ '&::-webkit-scrollbar': { display: 'none' } }}
          >
            <VStack align="start" spacing={4}>
              {/* 過去の投稿履歴（まだ実装前なのでプレースホルダ） */}
              <Box width="100%">
                <Heading size="sm" mb={1}>過去の投稿履歴</Heading>
                <Text fontSize="sm" color="gray.600">
                  投稿履歴の表示は今後のアップデートで対応予定です。
                </Text>
              </Box>

              <Divider />

              {/* 性格診断の詳細（最新結果） */}
              <Box width="100%">
                <Heading size="sm" mb={1}>MusicTypeの詳細</Heading>
                {user && user.scores && user.music_type ? (
                  <VStack align="start" spacing={1} fontSize="sm">
                    <Text>現在のタイプコード: <b>{user.music_type.code}</b></Text>
                    <Text>タイプ名: {user.music_type.name}</Text>
                    <Text>V-C: {user.scores.VC.toFixed(2)}</Text>
                    <Text>M-A: {user.scores.MA.toFixed(2)}</Text>
                    <Text>P-R: {user.scores.PR.toFixed(2)}</Text>
                    <Text>H-S: {user.scores.HS.toFixed(2)}</Text>
                  </VStack>
                ) : (
                  <Text fontSize="sm" color="gray.600">
                    まだ診断結果が登録されていません。曲に「いいね」したり、診断からプロフィールを作成してみましょう。
                  </Text>
                )}
              </Box>

              <Divider />

              {/* MBTI診断の履歴（バックエンド未実装のためプレースホルダ） */}
              <Box width="100%">
                <Heading size="sm" mb={1}>MusicTypeの履歴</Heading>
                <Text fontSize="sm" color="gray.600">
                  履歴表示は今後のアップデートで対応予定です。現在のタイプはプロフィール画面から確認できます。
                </Text>
              </Box>

              <Divider />

              <Box width="100%">
                <Heading size="sm" mb={1}>クレジット</Heading>
                <Text fontSize="sm" color="gray.600">
                  音楽：BGMer (http://bgmer.net)
                </Text>
              </Box>
            </VStack>
          </Box>
        </Box>

      </Container>
    </Box>
  )
}

export default Layout