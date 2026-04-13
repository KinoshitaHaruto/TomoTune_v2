import React from 'react'
import {
  Box,
  Heading,
  Text,
  Stack,
  Card,
  CardBody,
  Divider,
  Button,
  HStack,
  Image,
  IconButton,
} from '@chakra-ui/react'
import { FiPlay, FiExternalLink } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { useSpotify } from '../../../contexts/SpotifyContext'
import { usePlayer } from '../../../contexts/PlayerContext'
import type { SpotifyTrack } from '../../../types'

export type { SpotifyTrack }

interface SpotifyMusicCardProps {
  track: SpotifyTrack
}

const formatDuration = (ms: number) => {
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${m}:${s.toString().padStart(2, '0')}`
}

const SpotifyMusicCard: React.FC<SpotifyMusicCardProps> = ({ track }) => {
  const navigate = useNavigate()
  const { isConnected, isPremium, currentTrackId } = useSpotify()
  const { setActiveSpotifyTrack } = usePlayer()

  const isThisActive = currentTrackId === track.id
  const canPlay = isConnected && (isPremium ? true : !!track.preview_url)

  const handlePost = () => {
    navigate('/share', { state: { spotifyTrack: track } })
  }

  return (
    <Card
      w="100%"
      shadow="sm"
      borderRadius="lg"
      border="1px solid"
      borderColor={isThisActive ? 'green.300' : 'gray.200'}
      bg={isThisActive ? 'green.50' : 'white'}
      transition="all 0.2s"
    >
      <CardBody p={4}>
        <Stack spacing={3}>
          <HStack align="center" spacing={3}>
            {track.album_image ? (
              <Image
                src={track.album_image}
                alt={track.album}
                boxSize="50px"
                borderRadius="md"
                objectFit="cover"
                flexShrink={0}
              />
            ) : (
              <Box boxSize="50px" borderRadius="md" bg="gray.100" flexShrink={0} />
            )}
            <Box flex={1} minW={0}>
              <Heading size="md" noOfLines={1}>{track.title}</Heading>
              <Text color="gray.500" fontSize="sm" noOfLines={1}>{track.artist}</Text>
              <Text color="gray.400" fontSize="xs">{formatDuration(track.duration_ms)}</Text>
            </Box>
          </HStack>

          <Divider />

          <HStack justify="flex-end" spacing={2}>
            <Button
              as="a"
              href={track.spotify_url}
              target="_blank"
              rel="noopener noreferrer"
              size="sm"
              colorScheme="green"
              variant="outline"
              leftIcon={<FiExternalLink />}
            >
              Spotifyで開く
            </Button>
            <Button
              size="sm"
              colorScheme="pink"
              variant="outline"
              onClick={handlePost}
            >
              投稿
            </Button>
            <IconButton
              aria-label="再生"
              icon={<FiPlay />}
              size="sm"
              colorScheme="green"
              onClick={() => setActiveSpotifyTrack(track)}
              isDisabled={!canPlay}
            />
          </HStack>
        </Stack>
      </CardBody>
    </Card>
  )
}

export default SpotifyMusicCard
