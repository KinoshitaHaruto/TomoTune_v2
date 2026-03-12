import React, { createContext, useContext, useState } from 'react'
import type { Song } from '../types'

interface PlayerContextType {
  activeSong: Song | null
  setActiveSong: (song: Song | null) => void
}

const PlayerContext = createContext<PlayerContextType>({
  activeSong: null,
  setActiveSong: () => { },
})

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeSong, setActiveSong] = useState<Song | null>(null)

  return (
    <PlayerContext.Provider value={{ activeSong, setActiveSong }}>
      {children}
    </PlayerContext.Provider>
  )
}

export const usePlayer = () => useContext(PlayerContext)
