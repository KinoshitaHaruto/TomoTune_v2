import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { useToast } from '@chakra-ui/react'
import { useEffect } from 'react'
import Layout from './components/Layout'
import Home from './pages/Home'
import Login from './pages/Login'
import Survey from './pages/Survey'
import Share from './pages/Share'
import Music from './pages/Music'
import Profile from './pages/Profile'
import Follow from './pages/Follow'


function App() {
    const toast = useToast()

    useEffect(() => {
    const checkTime = () => {
        const now = new Date()
        const hour = now.getHours()
        const minute = now.getMinutes()
        const second = now.getSeconds()

        if ((hour === 8 && minute === 0 && second === 0) || (hour === 13 && minute === 0 && second === 0) || (hour === 18 && minute === 0 && second === 0)  /*|| (hour === 0 && minute === 35 && second === 0)*/) {
            toast({
                title: "投稿の時間です！",
                description: "音楽をシェアしましょう 🎵",
                status: "info",
                duration: 10000,
                isClosable: true,
            })
        }
    }

    // 1分ごとに時刻チェック
    const interval = setInterval(checkTime, 1000)
    return () => clearInterval(interval)
    }, [toast])

    return (
        <Routes>
            <Route element={<Layout />}>
            {/* Layoutで囲む
                path="/" 以下の全てのページに Layoutを適用
            */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/survey" element={<Survey />} />
                <Route path="/share" element={<Share />} />
                <Route path="/music" element={<Music />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/:userId" element={<Profile />} />
                <Route path="/follow" element={<Follow />} />
        </Route>
            
    
        </Routes>
    )
}

export default App