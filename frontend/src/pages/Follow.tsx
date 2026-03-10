import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Heading,
  Text,
  VStack,
  Button,
  useToast,
  Input,
  IconButton,
} from '@chakra-ui/react'
type FollowEntry = {
  userId: string
  profileCode?: string
}

function Follow() {
  const navigate = useNavigate()
  const toast = useToast()
  const scannerRef = useRef<any>(null)
  const [scanning, setScanning] = useState(false)
  const [manualInput, setManualInput] = useState('')
  const userIdRef = useRef<string>('')

  useEffect(() => {
    const userId = localStorage.getItem('tomo_user_id')
    if (!userId) {
      navigate('/login')
      return
    }
    userIdRef.current = userId
  }, [navigate])

  const handleFollowFromQr = (data: string) => {
    try {
      let payload: { userId: string; profileCode?: string } = { userId: data }

      // JSON 形式ならパースする
      if (data.startsWith('{')) {
        payload = JSON.parse(data)
      }

      if (!payload.userId) {
        toast({ title: 'QRコードの形式が不正です', status: 'error' })
        return
      }

      // 自分自身はフォローしない
      if (payload.userId === userIdRef.current) {
        toast({ title: '自分自身はフォローできません', status: 'info' })
        return
      }

      // 既存のフォローリストを取得
      const savedFollows = localStorage.getItem('tomo_follow_list')
      const followList: FollowEntry[] = savedFollows ? JSON.parse(savedFollows) : []

      // 重複チェック
      if (followList.some((f) => f.userId === payload.userId)) {
        toast({ title: 'すでにフォロー済みです', status: 'info' })
        return
      }

      const updated: FollowEntry[] = [
        ...followList,
        { userId: payload.userId, profileCode: payload.profileCode },
      ]
      localStorage.setItem('tomo_follow_list', JSON.stringify(updated))
      toast({ title: 'フォローしました', status: 'success' })
      navigate('/profile')
    } catch (e) {
      console.error('QRフォロー処理エラー:', e)
      toast({ title: 'QRコードの読み取りに失敗しました', status: 'error' })
    }
  }

  const startScan = async () => {
    if (scannerRef.current) {
      return
    }

    try {
      // 動的インポートでhtml5-qrcodeを読み込む
      const { Html5Qrcode } = await import('html5-qrcode')
      const html5QrCode = new Html5Qrcode('reader')
      scannerRef.current = html5QrCode

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          handleFollowFromQr(decodedText)
          stopScan()
        },
        (errorMessage) => {
          // エラーは無視（継続してスキャン）
        }
      )

      setScanning(true)
    } catch (err) {
      console.error('スキャン開始エラー:', err)
      toast({
        title: 'カメラへのアクセスを許可してください',
        status: 'error',
      })
    }
  }

  const stopScan = async () => {
  if (!scannerRef.current) return

  try {
    await scannerRef.current.stop()
    scannerRef.current.clear()
    scannerRef.current = null
    setScanning(false)
  } catch (err) {
    console.error('スキャン停止エラー:', err)
  }
}

  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      handleFollowFromQr(manualInput.trim())
      setManualInput('')
    }
  }

  useEffect(() => {
    return () => { stopScan() }
  }, [])

  return (
    <VStack spacing={6}>
      <Heading color="pink.400" size="lg">
  QRでフォロー
</Heading>

<IconButton
  aria-label="戻る"
  icon={<span style={{ fontSize: '18px' }}>←</span>}
  size="sm"
  variant="ghost"
  colorScheme="pink"
  onClick={() => navigate('/profile')}
  _hover={{ bg: 'pink.50' }}
  alignSelf="flex-start"
/>

      <Text fontSize="sm" color="gray.600" textAlign="center">
        友だちのプロフィールQRコードを読み取って、フォローしましょう
      </Text>

      <VStack spacing={4} width="100%" maxW="400px">
        <Button
          colorScheme="pink"
          size="lg"
          width="100%"
          onClick={() => startScan()}
        >
          カメラでQRコードをスキャン
        </Button>

        <Text fontSize="xs" color="gray.500" textAlign="center">
          または
        </Text>

        <VStack spacing={2} width="100%">
          <Input
            placeholder="ユーザーIDまたはQRコードの内容を入力"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleManualSubmit()
              }
            }}
          />
          <Button
            variant="outline"
            width="100%"
            onClick={handleManualSubmit}
            isDisabled={!manualInput.trim()}
          >
            手動でフォロー
          </Button>
        </VStack>
      </VStack>

      <Box
        id="reader"
        width="100%"
        maxW="400px"
        style={{ minHeight: '300px', marginTop: '20px' }}
      />
    </VStack>
  )
}

export default Follow
