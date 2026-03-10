import React, { useState, useEffect } from "react";
import { 
  Box, 
  Text, 
  Heading, 
  VStack, 
  HStack, 
  Progress, 
  Badge, 
  SimpleGrid, 
  Card, 
  CardBody,
  StackDivider,
  Image
} from "@chakra-ui/react";
import { useUser } from "../contexts/UserContext";
import { User } from "../types";
import { API_BASE } from "../config";

// スコアバーのサブコンポーネント
const ScoreBar = ({ label, value, color, leftLabel, rightLabel }: { label: string, value: number, color: string, leftLabel: string, rightLabel: string }) => (
  <Box width="100%">
    <HStack justifyContent="space-between" mb={1}>
      <Text fontSize="xs" fontWeight="bold" color="gray.500">{leftLabel}</Text>
      <Text fontSize="xs" fontWeight="bold">{label}</Text>
      <Text fontSize="xs" fontWeight="bold" color="gray.500">{rightLabel}</Text>
    </HStack>
    <Progress value={value * 100} size="sm" colorScheme={color} borderRadius="full" hasStripe />
    <HStack justifyContent="flex-end" mt={1}>
      <Text fontSize="xs" color="gray.400">{Math.round(value * 100)}%</Text>
    </HStack>
  </Box>
);

export const MusicTypeCard = ({ user: userOverride }: { user?: User | null }) => {
  const { user: currentUser } = useUser();
  const user = userOverride ?? currentUser;

  // まだデータがない、または診断前の場合
  if (!user || !user.music_type) {
    return (
      <Card variant="outline" borderColor="gray.200" bg="gray.50">
        <CardBody textAlign="center" py={8}>
          <Heading size="md" color="gray.400" mb={2}>No Analysis Data</Heading>
          <Text fontSize="sm" color="gray.500">
            まだ診断結果がありません。<br />
            ホーム画面で曲を聴いて「いいね」してみましょう！
          </Text>
        </CardBody>
      </Card>
    );
  }

  // データがある場合
  const { code, name, description } = user.music_type;
  const { VC, MA, PR, HS } = user.scores;
  
  // 画像の読み込み状態を管理
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const imageUrl = `${API_BASE}/type_pictures/${code}.jpg`;

  // 画像の読み込みをチェック
  useEffect(() => {
    setImageError(false);
    setImageLoading(true);
    const img = new window.Image();
    img.onload = () => {
      setImageLoading(false);
      setImageError(false);
    };
    img.onerror = () => {
      setImageLoading(false);
      setImageError(true);
    };
    img.src = imageUrl;
  }, [code, imageUrl]);

  return (
    <Card 
      variant="outline" 
      borderColor="pink.200" 
      boxShadow="sm" 
      overflow="hidden"
      bg="white"
    >
      <CardBody>
        <VStack align="stretch" spacing={5} divider={<StackDivider borderColor="gray.100" />}>
          
          {/* タイプ名表示エリア */}
          <Box textAlign="center">
            <Badge colorScheme="pink" variant="subtle" px={2} py={1} borderRadius="md" mb={2}>
              YOUR MUSIC TYPE
            </Badge>
            <Heading size="2xl" bgGradient="linear(to-r, pink.400, purple.500)" bgClip="text" letterSpacing="wider">
              {code}
            </Heading>
            <Text fontSize="lg" fontWeight="bold" mt={1} color="gray.700">
              {name}
            </Text>
            <Text fontSize="sm" color="gray.500" mt={2} px={4}>
              {description}
            </Text>
          </Box>

          {/* タイプ画像表示エリア */}
          <Box textAlign="center">
            {imageLoading ? (
              <Box 
                height="200px" 
                display="flex" 
                alignItems="center" 
                justifyContent="center"
                bg="gray.50"
                borderRadius="md"
              >
                <Text fontSize="sm" color="gray.400">読み込み中...</Text>
              </Box>
            ) : imageError ? (
              <Box 
                height="200px" 
                display="flex" 
                alignItems="center" 
                justifyContent="center"
                bg="gray.50"
                borderRadius="md"
                border="1px dashed"
                borderColor="gray.300"
              >
                <Text fontSize="sm" color="gray.500">
                  まだ画像が準備できていません
                </Text>
              </Box>
            ) : (
              <Image
                src={imageUrl}
                alt={`${name} (${code})`}
                maxH="200px"
                mx="auto"
                borderRadius="md"
                objectFit="contain"
              />
            )}
          </Box>

          {/* パラメータグラフエリア */}
          <Box>
            <Heading size="xs" textTransform="uppercase" color="gray.400" mb={4}>
              Analysis Details
            </Heading>
            <SimpleGrid columns={1} spacing={6}>
              <ScoreBar 
                label="Energy" 
                value={VC} 
                color="cyan" 
                leftLabel="Chill" 
                rightLabel="Vibe" 
              />
              <ScoreBar 
                label="Focus" 
                value={MA} 
                color="purple" 
                leftLabel="Melody" 
                rightLabel="Atmosphere" 
              />
              <ScoreBar 
                label="Emotion" 
                value={PR} 
                color="red" 
                leftLabel="Precision" 
                rightLabel="Romance" 
              />
              <ScoreBar 
                label="Texture" 
                value={HS} 
                color="orange" 
                leftLabel="Synth" 
                rightLabel="Human"
              />
            </SimpleGrid>
          </Box>
        </VStack>
      </CardBody>
    </Card>
  );
};