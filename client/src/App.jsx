import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import Register from './pages/register'
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
import StreamAnalytics from './pages/StreamAnalytics'
import PolicyGate from './components/PolicyGate'
import PrivacyPolicy from './pages/PrivacyPolicy'

const savedTheme = localStorage.getItem('theme') || 'dark'
document.documentElement.setAttribute('data-theme', savedTheme)

// create socket ONCE outside components
const socket = io('http://localhost:5000', {
  autoConnect: false,
  withCredentials: true,
})
// add this after socket is created
window._socket = socket
function Layout() {
  const location = useLocation()
  const hideNavbar = ['/login', '/register', '/'].includes(location.pathname)
  const { token, user, updateUser, logout } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (token && user) {
      console.log('🔑 token being sent:', token)
      socket.auth = { token }
      socket.connect()
      socket.on('connect', () => console.log(' socket connected:', socket.id))
      socket.on('connect_error', (err) => console.log(' error:', err.message))

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
        if (err.response?.status === 401) {
          logout()
          navigate('/login')
        }
      })
    } else if (!token && !user) {
      socket.disconnect()
      navigate('/login')
    }
  }, [token])

  const [policyAccepted, setPolicyAccepted] = useState(
    () => localStorage.getItem('flowspace-policy-accepted') === 'true'
  )

  const handlePolicyAccept = () => {
    localStorage.setItem('flowspace-policy-accepted', 'true')
    setPolicyAccepted(true)
  }

  return (
    <>
    {!policyAccepted && <PolicyGate onAccept={handlePolicyAccept} />}
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
        <Route path="/analytics/streams" element={<StreamAnalytics />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      </Routes>
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <LiveStreamProvider socket={socket}>
        <Layout />
      </LiveStreamProvider>
    </BrowserRouter>
  )
}

export default App