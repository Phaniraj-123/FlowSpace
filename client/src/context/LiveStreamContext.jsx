import { createContext, useContext, useRef, useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import { useAuthStore } from '../store/authStore'

const LiveStreamContext = createContext(null)

export function LiveStreamProvider({ children }) {
  const { token, user } = useAuthStore()
  const socketRef = useRef(null)
  const localStreamRef = useRef(null)
  const [activeStreamId, setActiveStreamId] = useState(null)
  const [isHosting, setIsHosting] = useState(false)

  function getSocket() {
    if (!socketRef.current || !socketRef.current.connected) {
      socketRef.current = io('http://localhost:5000', { auth: { token } })
    }
    return socketRef.current
  }

  async function startStream(streamId) {
    const socket = getSocket()
    socket.emit('stream:join', { streamId })
    setActiveStreamId(streamId)
    setIsHosting(true)

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 }, audio: true
      })
      localStreamRef.current = mediaStream
      socket.emit('stream:host_ready', { streamId })
    } catch (err) {
      console.log('Camera error:', err)
    }
  }

  function joinStream(streamId) {
    const socket = getSocket()
    socket.emit('stream:join', { streamId })
    setActiveStreamId(streamId)
    setIsHosting(false)
  }

  function endStream(streamId) {
    const socket = socketRef.current
    if (socket) {
      socket.emit('stream:leave', { streamId })
      socket.disconnect()
      socketRef.current = null
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop())
      localStreamRef.current = null
    }
    setActiveStreamId(null)
    setIsHosting(false)
  }

  function leaveStream(streamId) {
    const socket = socketRef.current
    if (socket) {
      socket.emit('stream:leave', { streamId })
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop())
      localStreamRef.current = null
    }
    setActiveStreamId(null)
    setIsHosting(false)
  }

  // auto end stream on logout
  useEffect(() => {
    if (!user && activeStreamId && isHosting) {
      endStream(activeStreamId)
    }
  }, [user])

  return (
    <LiveStreamContext.Provider value={{
      socket: socketRef.current,
      getSocket,
      localStreamRef,
      activeStreamId,
      isHosting,
      startStream,
      joinStream,
      endStream,
      leaveStream
    }}>
      {children}
    </LiveStreamContext.Provider>
  )
}

export const useLiveStream = () => useContext(LiveStreamContext)