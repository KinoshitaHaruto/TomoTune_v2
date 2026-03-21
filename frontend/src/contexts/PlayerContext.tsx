import React, { createContext, useContext, useState } from 'react'
import type { Song, SpotifyTrack } from '../types'

interface PlayerContextType {
  activeSong: Song | null
  setActiveSong: (song: Song | null) => void
  activeSpotifyTrack: SpotifyTrack | null
  setActiveSpotifyTrack: (track: SpotifyTrack | null) => void
}

const PlayerContext = createContext<PlayerContextType>({
  activeSong: null,
  setActiveSong: () => { },
  activeSpotifyTrack: null,
  setActiveSpotifyTrack: () => { },
})

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeSong, setActiveSong] = useState<Song | null>(null)
  const [activeSpotifyTrack, setActiveSpotifyTrack] = useState<SpotifyTrack | null>(null)

  const handleSetActiveSong = (song: Song | null) => {
    setActiveSong(song)
    if (song) setActiveSpotifyTrack(null)
  }

  const handleSetActiveSpotifyTrack = (track: SpotifyTrack | null) => {
    setActiveSpotifyTrack(track)
    if (track) setActiveSong(null)
  }

  return (
    <PlayerContext.Provider value={{
      activeSong,
      setActiveSong: handleSetActiveSong,
      activeSpotifyTrack,
      setActiveSpotifyTrack: handleSetActiveSpotifyTrack,
    }}>
      {children}
    </PlayerContext.Provider>
  )
}

export const usePlayer = () => useContext(PlayerContext)
