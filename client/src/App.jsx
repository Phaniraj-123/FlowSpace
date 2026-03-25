import { useEffect } from 'react'
import axios from 'axios'
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import Register from './pages/Register'
import Login from './pages/Login'
import Goals from './pages/Goals'
import Sessions from './pages/Sessions'
import Feed from './pages/feed'
import Navbar from './components/Navbar'
import { useAuthStore } from './store/authStore'
import Profile from './pages/profile'
import PostDetail from './pages/postdetail'
import Search from './pages/search'
import Notifications from './pages/Notifications'
import UserProfile from './pages/userProfile'
import Analytics from './pages/Analytics'
import Leaderboard from './pages/Leaderboard'
import Messages from './pages/Messages'
import LiveStreams from './pages/LiveStreams'
import LiveStreamRoom from './pages/LiveStreamRoom'
import Monetization from './pages/Monetization'
import CreatorSubscription from './pages/CreatorSubscription'
import { LiveStreamProvider } from './context/LiveStreamContext'
import Settings from './pages/Settings'

// apply saved theme on load
const savedTheme = localStorage.getItem('theme') || 'dark'
document.documentElement.setAttribute('data-theme', savedTheme)


function Layout() {

  const location = useLocation()
  const hideNavbar = ['/login', '/register', '/'].includes(location.pathname)
  const { token, user, updateUser, logout } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (token && user) {
      axios.get('http://localhost:5000/api/users/me', {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        updateUser({
          avatar: res.data.avatar,
          bio: res.data.bio,
          username: res.data.username,
          email: res.data.email,
          subscriptionTier: res.data.subscriptionTier,
          name: res.data.name
        })
      }).catch(err => {
        // if 401 — token expired, log out
        if (err.response?.status === 401) {
          logout()
          navigate('/login')
        }
      })
    }else if (!token && !user) {
    navigate('/login')
    }
  }, [token])
  return (
    <>
      {user && !hideNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/sessions" element={<Sessions />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/post/:id" element={<PostDetail />} />
        <Route path="/search" element={<Search />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/user/:username" element={<UserProfile />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/messages/:conversationId" element={<Messages />} />
        <Route path="/live" element={<LiveStreams />} />
        <Route path="/live/:id" element={<LiveStreamRoom />} />
        <Route path="/monetization" element={<Monetization />} />
        <Route path="/creator-subscription" element={<CreatorSubscription />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <LiveStreamProvider>
        <Layout />
      </LiveStreamProvider>
    </BrowserRouter>
  )
}

export default App