import React, { useState, useEffect } from 'react'
import {
  Box,
  VStack,
  HStack,
  Input,
  Button,
  Text,
  Heading,
  Spinner,
  Alert,
  AlertIcon,
  Divider,
} from '@chakra-ui/react'
import { FiSearch } from 'react-icons/fi'
import { useSpotify } from '../../../contexts/SpotifyContext'
import { API_BASE } from '../../../config'
import SpotifyMusicCard from './SpotifyMusicCard'
import type { SpotifyTrack } from '../../../types'

const SpotifySection: React.FC = () => {
  const { accessToken, isPlayerReady, isPremium } = useSpotify()

  const [recommended, setRecommended] = useState<SpotifyTrack[]>([])
  const [recLoading, setRecLoading] = useState(true)
  const [recType, setRecType] = useState<'top' | 'popular'>('top')

  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken) return
    setRecLoading(true)
    fetch(`${API_BASE}/spotify/top-tracks?access_token=${encodeURIComponent(accessToken)}&limit=20`)
      .then((res) => res.json())
      .then((data) => {
        setRecommended(data.tracks || [])
        setRecType(data.type || 'top')
      })
      .catch(() => setRecommended([]))
      .finally(() => setRecLoading(false))
  }, [accessToken])

  const handleSearch = async () => {
    if (!query.trim()) return
    setSearching(true)
    setSearched(true)
    setSearchError(null)
    try {
      const res = await fetch(`${API_BASE}/spotify/search?q=${encodeURIComponent(query)}&limit=10`)
      if (!res.ok) throw new Error('Search failed')
      const data = await res.json()
      setSearchResults(data.tracks || [])
    } catch {
      setSearchResults([])
      setSearchError('検索に失敗しました。しばらくしてから再度お試しください。')
    } finally {
      setSearching(false)
    }
  }

  return (
    <VStack spacing={6} align="stretch">
      {/* プレイヤー状態 */}
      {isPremium && (
        <HStack spacing={2} fontSize="xs">
          <Box w={2} h={2} borderRadius="full" bg={isPlayerReady ? 'green.400' : 'yellow.400'} />
          <Text color="gray.400">
            {isPlayerReady ? 'Spotifyプレイヤー準備完了' : 'プレイヤー初期化中...'}
          </Text>
        </HStack>
      )}

      {/* おすすめ曲セクション */}
      <Box>
        <Heading size="md" color="green.500" mb={3}>
          {recType === 'top' ? 'あなたへのおすすめ' : '人気の曲'}
        </Heading>
        {recLoading ? (
          <Box textAlign="center" py={6}>
            <Spinner color="green.400" />
          </Box>
        ) : recommended.length === 0 ? (
          <Text color="gray.500" textAlign="center" py={4}>
            おすすめ曲を取得できませんでした
          </Text>
        ) : (
          <VStack spacing={2} align="stretch">
            {recommended.map((track) => (
              <SpotifyMusicCard key={track.id} track={track} />
            ))}
          </VStack>
        )}
      </Box>

      <Divider />

      {/* 検索セクション */}
      <Box>
        <Heading size="md" color="green.500" mb={3}>Spotify 検索</Heading>
        <HStack mb={3}>
          <Input
            placeholder="曲名・アーティスト名で検索..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            borderColor="green.200"
            _focus={{ borderColor: 'green.400' }}
          />
          <Button
            colorScheme="green"
            onClick={handleSearch}
            isLoading={searching}
            leftIcon={<FiSearch />}
            flexShrink={0}
          >
            検索
          </Button>
        </HStack>

        {searchError && (
          <Alert status="error" borderRadius="md" mb={2}>
            <AlertIcon />
            {searchError}
          </Alert>
        )}
        {searching && (
          <Box textAlign="center" py={4}>
            <Spinner color="green.400" />
          </Box>
        )}
        {!searching && searched && searchResults.length === 0 && !searchError && (
          <Text color="gray.500" textAlign="center" py={4}>
            曲が見つかりませんでした
          </Text>
        )}
        {!searching && searchResults.length > 0 && (
          <VStack spacing={2} align="stretch">
            {searchResults.map((track) => (
              <SpotifyMusicCard key={track.id} track={track} />
            ))}
          </VStack>
        )}
      </Box>
    </VStack>
  )
}

export default SpotifySection
