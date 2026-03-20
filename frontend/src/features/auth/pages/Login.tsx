"use client";

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Divider,
  Heading,
  HStack,
  Input,
  Text,
  VStack,
  useToast,
} from '@chakra-ui/react'

import { useUser } from '../../../contexts/UserContext'
import { useSpotify } from '../../../contexts/SpotifyContext'

// コンポーネントの初期化時にURLパラメータを同期的に読み取る
const initialParams = new URLSearchParams(window.location.search)
const initialUserId = initialParams.get('user_id')
const initialError = initialParams.get('error')

function Login() {
  const [name, setName] = useState("")
  const navigate = useNavigate()
  const toast = useToast()
  const { login, loginWithId, refreshUser, user, isLoading } = useUser()
  const { login: spotifyLogin } = useSpotify()

  // 既にログイン済みなら状態に応じてリダイレクト
  useEffect(() => {
    const savedId = localStorage.getItem("tomo_user_id")
    if (savedId && !user && !isLoading) {
      refreshUser()
    }
  }, [user, isLoading, refreshUser])

  useEffect(() => {
    if (isLoading || !user) return
    if (user.music_type || user.music_type_code) {
      navigate("/profile", { replace: true })
    } else {
      navigate("/survey", { replace: true })
    }
  }, [user, isLoading, navigate])

  // SpotifyコールバックのURLパラメータ処理（同期的に読んだuser_idを使用）
  useEffect(() => {
    if (initialError) {
      toast({ title: 'Spotify連携に失敗しました', status: 'error' })
      return
    }
    if (initialUserId) {
      loginWithId(initialUserId).then((loggedInUser) => {
        if (!loggedInUser) {
          toast({ title: 'ログインエラー', status: 'error' })
        }
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = async () => {
    if (!name.trim()) {
      toast({ title: "名前を入力してください", status: "warning" })
      return
    }

    const loggedInUser = await login(name)

    if (loggedInUser) {
      toast({ title: `ようこそ、${loggedInUser.name}さん！`, status: "success" })
      if (loggedInUser.music_type || loggedInUser.music_type_code) {
        navigate("/profile")
      } else {
        navigate("/survey")
      }
    } else {
      toast({ title: "ログインエラー", status: "error" })
    }
  }

  return (
    <VStack spacing={8} mt={10}>
      <VStack spacing={2}>
        <Heading color="pink.400" size="xl">TomoTune</Heading>
        <Text color="gray.500">音楽でつながろう</Text>
      </VStack>

      {/* Spotifyでログイン */}
      <VStack spacing={3} width="100%">
        <Text fontWeight="bold" color="gray.700">Spotifyアカウントでログイン</Text>
        <Button
          width="100%"
          size="lg"
          bg="#1DB954"
          color="white"
          _hover={{ bg: "#1aa34a" }}
          onClick={spotifyLogin}
          isLoading={isLoading && !!initialUserId}
        >
          Spotifyでログイン
        </Button>
        <Text fontSize="xs" color="gray.400">
          Premiumプランでアプリ内再生ができます
        </Text>
      </VStack>

      <HStack width="100%" spacing={4}>
        <Divider />
        <Text color="gray.400" fontSize="sm" whiteSpace="nowrap">または</Text>
        <Divider />
      </HStack>

      {/* お試しログイン */}
      <VStack spacing={3} width="100%">
        <Text fontWeight="bold" color="gray.700">ニックネームでお試し</Text>
        <Input
          placeholder="ニックネームを入力"
          size="lg"
          bg="white"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
        />
        <Button
          colorScheme="pink"
          size="lg"
          width="100%"
          onClick={handleLogin}
          isLoading={isLoading && !initialUserId}
        >
          はじめる
        </Button>
      </VStack>
    </VStack>
  )
}

export default Login
