import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Heading, VStack, HStack, Box, Text, useToast, Circle } from '@chakra-ui/react'
import { useUser } from '../contexts/UserContext'
import { API_BASE } from '../config'

interface Answer {
  [key: number]: number // 質問番号 -> 回答（1-7）
}

function Survey() {
  const [answers, setAnswers] = useState<Answer>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()

  // isLoadingも取得して、ロード完了を待てるようにする
  const { user, refreshUser, isLoading: isUserLoading } = useUser()

  // デバッグ用: ユーザー状態の確認
  useEffect(() => {
    console.log("Survey Page - Current User:", user, "Loading:", isUserLoading)
  }, [user, isUserLoading])

  useEffect(() => {
    const hasStoredId = localStorage.getItem("tomo_user_id");

    if (!isUserLoading && !user && !hasStoredId) {
      toast({ 
        title: "ログインが必要です", 
        description: "セッションが無効なためログイン画面へ移動します",
        status: "warning",
        duration: 3000
      })
      navigate('/login')
    }
  }, [isUserLoading, user, navigate, toast])

  // 既に診断済みならプロフィールへ誘導
  useEffect(() => {
    if (isUserLoading) return
    if (user && (user.music_type || user.music_type_code)) {
      navigate('/profile', { replace: true })
    }
  }, [user, isUserLoading, navigate])

  const questions = [
    // V vs C
    { id: 1, text: "定期的に新しい友人を作っている。", type: "V_C", side: "V" },
    { id: 2, text: "単純明快なアイデアよりも、複雑で新奇なアイデアのほうがワクワクする。", type: "V_C", side: "V" },
    { id: 3, text: "BGMにはテンポ感のある曲を選びがちだ。", type: "V_C", side: "V" },
    // M vs A
    { id: 4, text: "曲の良さは、メロディの良さで決まることが多い。", type: "M_A", side: "M" },
    { id: 5, text: "音楽に世界観やストーリー性を重視する。", type: "M_A", side: "A" },
    { id: 6, text: "曲単体より、アルバム全体の雰囲気のほうが気になる。", type: "M_A", side: "A" },
    // P vs R
    { id: 7, text: "曲を聴くとき、まず「どう作っているのか」が気になる。", type: "P_R", side: "P" },
    { id: 8, text: "ボーカルの感情が乗っている曲に弱い。", type: "P_R", side: "R" },
    { id: 9, text: "同じ曲でも、歌声の\"表現\"で評価が大きく変わる。", type: "P_R", side: "R" },
    // H vs S
    { id: 10, text: "生楽器の温もりのある音が好きだ。", type: "H_S", side: "H" },
    { id: 11, text: "電子的な音楽やシンセサウンドに魅力を感じる。", type: "H_S", side: "S" },
    { id: 12, text: "生演奏より電子的なアレンジのほうが集中できる。", type: "H_S", side: "S" },
  ]

  const groupedQuestions = {
    "V（ノリ）↔ C（静けさ）": questions.slice(0, 3),
    "M（メロディ）↔ A（世界観）": questions.slice(3, 6),
    "P（技術）↔ R（感情）": questions.slice(6, 9),
    "H（生音）↔ S（電子音）": questions.slice(9, 12),
  }

  const handleAnswer = (questionId: number, value: number) => {
    setAnswers({ ...answers, [questionId]: value })
  }

  const circleSizes = ["44px", "36px", "28px", "20px", "28px", "36px", "44px"]

  const calculateNormalizedScores = () => {
    // まず各軸のスコアを計算 (-9 〜 +9 の範囲)
    const rawScores = { V_C: 0, M_A: 0, P_R: 0, H_S: 0 }

    questions.forEach((q) => {
      const answer = answers[q.id] || 4 // デフォルト4
      const score = answer - 4 // -3 ~ +3

      if (q.type === "V_C") rawScores.V_C += q.side === "V" ? score : -score
      if (q.type === "M_A") rawScores.M_A += q.side === "M" ? -score : score // M=0.0側
      if (q.type === "P_R") rawScores.P_R += q.side === "P" ? score : -score
      if (q.type === "H_S") rawScores.H_S += q.side === "H" ? -score : score // H=1.0側
    })

    // -9〜+9 を 0.0〜1.0 に正規化する関数
    // (val + 9) / 18
    const normalize = (val: number) => (val + 9) / 18

    return {
      score_vc: normalize(rawScores.V_C),
      score_ma: normalize(rawScores.M_A),
      score_pr: normalize(rawScores.P_R),
      score_hs: normalize(rawScores.H_S),
    }
  }

  const handleSubmit = async () => {
    const answeredCount = Object.keys(answers).length
    if (answeredCount < 12) {
      toast({ title: "全ての質問に答えてください", status: "warning" })
      return
    }

    const storedUserId = localStorage.getItem("tomo_user_id");

    // user がまだ Context に載っていない場合でも、localStorage に ID があればそれを使う
    if (!storedUserId) {
      toast({ title: "ログインセッションが無効です。再ログインしてください。", status: "error" })
      navigate('/login')
      return
    }

    setIsSubmitting(true)
    const scores = calculateNormalizedScores()

    try {
        // API送信
        const res = await fetch(`${API_BASE}/diagnosis`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: storedUserId,
                ...scores
            }),
        })

        if (!res.ok) throw new Error("API Error")
        
        // 成功したらユーザー情報を最新化
        await refreshUser()
        
        // 遷移前にスクロール位置をリセット
        window.scrollTo(0, 0)
        
        toast({ title: "診断完了！", status: "success" })
        navigate('/profile', { replace: true })

    } catch (error) {
        console.error(error)
        toast({ title: "送信に失敗しました", status: "error" })
    } finally {
        setIsSubmitting(false)
    }
  }

  return (
    <VStack spacing={6} mt={4} pb={20}>
      <VStack spacing={2} textAlign="center">
        <Heading color="pink.400" size="md">あなたの音楽嗜好は？</Heading>
        <Text color="gray.500" fontSize="sm">7段階で答えてください</Text>
      </VStack>

      {Object.entries(groupedQuestions).map((entry, groupIndex) => (
        <Box key={groupIndex} width="100%">
          {entry[1].map((q) => (
            <VStack key={q.id} spacing={2} mb={6} align="start" width="100%">
              <Text fontSize="sm" color="gray.700" fontWeight="bold">
                {q.text}
              </Text>
              <HStack spacing={1} width="100%" justify="space-between">
                <Text fontSize="xs" color="gray.400">そう思わない</Text>
                <HStack spacing={1}>
                  {[1, 2, 3, 4, 5, 6, 7].map((value) => (
                    <Circle
                      key={value}
                      size={circleSizes[value - 1]}
                      border="2px solid"
                      borderColor={answers[q.id] === value ? "pink.400" : "gray.200"}
                      bg={answers[q.id] === value ? "pink.400" : "transparent"}
                      cursor="pointer"
                      onClick={() => handleAnswer(q.id, value)}
                      _hover={{ borderColor: "pink.300", bg: "pink.50" }}
                      transition="all 0.12s"
                    />
                  ))}
                </HStack>
                <Text fontSize="xs" color="gray.400">そう思う</Text>
              </HStack>
            </VStack>
          ))}
          {groupIndex < 3 && <Box width="100%" height="1px" bg="gray.100" my={4} />}
        </Box>
      ))}

      <Button
        colorScheme="pink"
        size="lg"
        width="80%"
        isLoading={isSubmitting}
        loadingText="診断中..."
        onClick={handleSubmit}
        mt={6}
        boxShadow="lg"
      >
        診断する
      </Button>
    </VStack>
  )
}

export default Survey