import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Heading, Input, Text, VStack, useToast } from '@chakra-ui/react'

import { useUser } from '../contexts/UserContext'

function Login() {
  const [name, setName] = useState("")
  const navigate = useNavigate() // 画面遷移用のフック
  const toast = useToast()
  const { login, refreshUser, user, isLoading } = useUser()

  // 既にログイン済みなら状態に応じてリダイレクト
  useEffect(() => {
    const savedId = localStorage.getItem("tomo_user_id")
    if (savedId && !user && !isLoading) {
      // user が未取得なら最新化してから判断する
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

  const handleLogin = async () => {
    if (!name) {
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
        <Heading color="pink.400" size="xl">ログイン</Heading>
        <Text color="gray.500">名前を入力してスタート</Text>
      </VStack>

      <Input 
        placeholder="ニックネーム" 
        size="lg" 
        bg="white"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <Button 
        colorScheme="pink" 
        size="lg" 
        width="100%" 
        onClick={handleLogin}
        isLoading={isLoading} 
      >
        はじめる
      </Button>
    </VStack>
  )
}

export default Login