import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Box,
    IconButton,
    useToast,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    ModalCloseButton,
    Button,
    Text,
    useDisclosure
} from '@chakra-ui/react'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../../../config'         // APIのURL設定
import { useUser } from '../../../contexts/UserContext' // Context利用
import type { Song } from '../../types'

// --- 飛び出すハートコンポーネント ---
const FlyingHeart = () => {
    const randomX = Math.random() * 60 - 30;
    return (
        <motion.div
            initial={{ opacity: 1, y: 0, x: 0, scale: 0.5 }}
            animate={{
                opacity: 0,
                y: -150,
                x: randomX,
                scale: 1.3,
                rotate: randomX
            }}
            transition={{ duration: 1, ease: "easeOut" }}
            style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                fontSize: '24px',
                pointerEvents: 'none',
                zIndex: 10
            }}
        >
            ❤️
        </motion.div>
    )
}

// --- LikeButton本体 ---

type LikeButtonProps = {
    songId: number | string;
    song?: Song; // 完全なSongオブジェクト（投稿確認モーダル用）
    // 親側で「見た目のカウント」やマイルストーン検知をしたい場合に使う
    onLikeSuccess?: (newTotal: number, isMilestone: boolean) => void;
    [key: string]: any;
};

const POST_MILESTONE = 15; // 15回いいねで投稿確認

const LikeButton = ({ songId, song, onLikeSuccess, ...props }: LikeButtonProps) => {
    const [hearts, setHearts] = useState<{ id: number }[]>([]);
    const { user, refreshUser } = useUser(); // Contextからユーザー情報と更新関数を取得
    const toast = useToast();
    const navigate = useNavigate();
    const lastNotifiedTypeRef = useRef<string | null>(null);
    const postModal = useDisclosure();

    const handleClick = async () => {
        // ユーザーIDを確定（Context -> localStorage の順で取得）
        const targetUserId = user?.id || localStorage.getItem("tomo_user_id");
        if (!targetUserId) {
            toast({
                title: "ログインが必要です",
                status: "warning",
                duration: 2000,
                isClosable: true,
            });
            return;
        }

        // アニメーション開始 (見た目の即時反応)
        const newHeart = { id: Date.now() };
        setHearts((prev) => [...prev, newHeart]);
        setTimeout(() => removeHeart(newHeart.id), 1000);

        try {
            const res = await fetch(`${API_BASE}/likes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    song_id: songId,
                    user_id: targetUserId
                }),
            });

            if (!res.ok) {
                throw new Error("API Error");
            }

            const data = await res.json();

            // 診断結果の変化検知ロジック
            const oldType = user?.music_type?.code;
            const newType = data.user_music_type;

            // ユーザー情報の最新化 (Context更新)
            await refreshUser();

            // 通知分岐
            if (oldType && newType && oldType !== newType && lastNotifiedTypeRef.current !== newType) {
                // タイプが変わった場合（かつ前回と同じタイプへの変化トーストをまだ出していない場合）
                lastNotifiedTypeRef.current = newType;
                toast({
                    title: "Music Type Updated!",
                    description: `あなたのMusic Typeが変化しました！プロフィールをチェック！`,
                    status: "info",
                    duration: 5000,
                    isClosable: true,
                    position: "top",
                });
            } else if (data.total_likes === POST_MILESTONE) {
                // 15回いいね達成時：投稿確認モーダルを表示
                postModal.onOpen();
            } else if (data.is_milestone) {
                // ちょうど5回目達成時のみ
                toast({
                    title: "5回いいね！達成🎉",
                    description: "お気に入りに追加されました。",
                    status: "success",
                    duration: 3000,
                    isClosable: true,
                });
            }

            // 親コンポーネントに通知（現在のお気に入り状態を渡す）
            if (onLikeSuccess) {
                onLikeSuccess(data.total_likes, data.is_favorite);
            }

        } catch (error) {
            console.error("Like Error:", error);
            toast({ title: "エラーが発生しました", status: "error" });
        }
    };

    const removeHeart = (heartId: number) => {
        setHearts((prev) => prev.filter((h) => h.id !== heartId));
    }

    const handlePostConfirm = () => {
        postModal.onClose();
        // Shareページに遷移（曲情報を渡す）
        if (song) {
            navigate('/share', {
                state: { song }
            });
        } else {
            // songが渡されていない場合は、曲IDから取得を試みる
            toast({
                title: "曲情報が不足しています",
                description: "Musicページから投稿してください",
                status: "warning",
                duration: 3000,
            });
            navigate('/music');
        }
    };

    return (
        <>
            <Box position="relative" display="inline-block" {...props}>
                <AnimatePresence>
                    {hearts.map((heart) => (
                        <FlyingHeart
                            key={heart.id}
                        />
                    ))}
                </AnimatePresence>

                <motion.div whileTap={{ scale: 0.8 }}>
                    <IconButton
                        icon={<span style={{ fontSize: "20px", marginTop: "2px" }}>❤</span>}
                        aria-label="いいね"
                        isRound={true}
                        bg="pink.50"
                        color="pink.400"
                        size="md" // 少しサイズ調整
                        _hover={{ bg: "pink.100" }}
                        onClick={handleClick}
                    />
                </motion.div>
            </Box>

            {/* 15回いいね達成時の投稿確認モーダル */}
            <Modal isOpen={postModal.isOpen} onClose={postModal.onClose} isCentered>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>15回いいね達成！🎉</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <Text>
                            {song ? `「${song.title}」` : 'この曲'}に15回いいねしました！
                            <br />
                            この曲を投稿してみませんか？
                        </Text>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="ghost" mr={3} onClick={postModal.onClose}>
                            後で
                        </Button>
                        <Button colorScheme="pink" onClick={handlePostConfirm}>
                            投稿する
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>
    )
}
export default LikeButton