import { createContext, useContext, useRef, useState, useCallback } from 'react'
import SimplePeer from 'simple-peer'
import { io } from 'socket.io-client'
import { useAuthStore } from '../store/authStore'

const LiveStreamContext = createContext(null)

export function LiveStreamProvider({ children, socket }) {
  const socketRef = useRef(null)

  if (!socketRef.current) {
    socketRef.current = socket || io('http://localhost:5000', {
      autoConnect: true,
      withCredentials: true,
      auth: { token: useAuthStore.getState().token }
    })
    if (!socketRef.current.connected) {
      socketRef.current.connect()
    }
  }

  const activeSocket = socketRef.current

  const getSocket = useCallback(() => activeSocket, [activeSocket])
  const [isHosting, setIsHosting] = useState(false)
  const [activeStreamId, setActiveStreamId] = useState(null)
  const [streamType, setStreamType] = useState(null)

  const localStreamRef = useRef(null)
  const peersRef = useRef({})
  const hlsInstanceRef = useRef(null)

  // ─── START stream (browser/WebRTC) ───────────────────────────
  const startStream = useCallback(async (streamId) => {
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, frameRate: 30 },
        audio: { echoCancellation: true, noiseSuppression: true }
      })

      localStreamRef.current = media
      setIsHosting(true)
      setActiveStreamId(streamId)
      setStreamType('webrtc')

      activeSocket.emit('stream:host_join', { streamId })

      // when a viewer requests stream, send them an offer
      activeSocket.off('stream:viewer_wants_offer')
      activeSocket.on('stream:viewer_wants_offer', ({ viewerId }) => {
        console.log('🎯 Host sending offer to viewer:', viewerId)
        if (viewerId) sendOfferToPeer(viewerId, streamId, media)
      })

      activeSocket.off('webrtc:answer')
      activeSocket.on('webrtc:answer', ({ answer, viewerId }) => {
        const peer = peersRef.current[viewerId]
        if (peer) peer.signal(answer)
      })

      activeSocket.off('webrtc:ice_candidate')
      activeSocket.on('webrtc:ice_candidate', ({ candidate, fromId }) => {
        const peer = peersRef.current[fromId]
        if (peer) peer.signal(candidate)
      })

      return media
    } catch (err) {
      console.error('Failed to start stream:', err)
      throw err
    }
  }, [activeSocket])

  // ─── Send WebRTC offer to a specific viewer ──────────────────
  function sendOfferToPeer(viewerId, streamId, stream) {
    // destroy existing peer for this viewer if any
    if (peersRef.current[viewerId]) {
      peersRef.current[viewerId].destroy()
    }

    const peer = new SimplePeer({
      initiator: true,
      trickle: true,
      stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }
    })

    peersRef.current[viewerId] = peer

    peer.on('signal', (data) => {
      if (data.type === 'offer') {
        activeSocket.emit('webrtc:offer', { streamId, offer: data, viewerId })
      } else if (data.candidate) {
        activeSocket.emit('webrtc:ice_candidate', { streamId, candidate: data, toId: viewerId })
      }
    })

    peer.on('error', (err) => {
      console.error('Peer error for viewer', viewerId, err)
      peer.destroy()
      delete peersRef.current[viewerId]
    })

    peer.on('close', () => {
      delete peersRef.current[viewerId]
    })
  }

  // ─── JOIN stream as viewer ────────────────────────────────────
  const joinStream = useCallback((streamId, streamKey = null) => {
    setActiveStreamId(streamId)

    if (streamKey) {
      // OBS stream — HLS mode
      setStreamType('hls')
      return
    }

    // Browser stream — WebRTC mode
    setStreamType('webrtc')

    // tell server we want the host's stream
    activeSocket.emit('stream:request_offer', { streamId })
  }, [activeSocket])  // ← was using wrong socket ref

  // ─── Receive WebRTC offer as viewer ──────────────────────────
  const receiveOffer = useCallback((offer, streamId, viewerId, onStream) => {
    // destroy existing peer if any
    if (peersRef.current[viewerId]) {
      peersRef.current[viewerId].destroy()
    }

    const peer = new SimplePeer({
      initiator: false,
      trickle: true,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }
    })

    peersRef.current[viewerId] = peer

    peer.signal(offer)

    peer.on('signal', (data) => {
      if (data.type === 'answer') {
        activeSocket.emit('webrtc:answer', { streamId, answer: data, viewerId })
      } else if (data.candidate) {
        activeSocket.emit('webrtc:ice_candidate', { streamId, candidate: data, toId: viewerId })
      }
    })

    peer.on('stream', (remoteStream) => {
      console.log('✅ Got remote stream from host!')
      onStream(remoteStream)
    })

    peer.on('error', (err) => {
      console.error('Viewer peer error:', err)
      peer.destroy()
    })

    peer.on('close', () => {
      console.log('Peer connection closed')
    })

    return peer
  }, [activeSocket])  // ← was using wrong socket ref

  // ─── Load HLS stream (OBS) ────────────────────────────────────
  const loadHLSStream = useCallback((videoElement, streamKey) => {
    const hlsUrl = `${import.meta.env.VITE_HLS_URL || 'http://localhost:8000'}/live/${streamKey}/index.m3u8`

    if (window.Hls && window.Hls.isSupported()) {
      const hls = new window.Hls({
        lowLatencyMode: true,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 6,
        maxLiveSyncPlaybackRate: 1.5,
      })

      hlsInstanceRef.current = hls
      hls.loadSource(hlsUrl)
      hls.attachMedia(videoElement)

      hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
        videoElement.play().catch(() => { })
      })

      hls.on(window.Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          console.error('HLS fatal error, retrying...')
          setTimeout(() => hls.startLoad(), 3000)
        }
      })

      return hls
    } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      videoElement.src = hlsUrl
      videoElement.play().catch(() => { })
    }
  }, [])

  // ─── END stream (host) ────────────────────────────────────────
  const endStream = useCallback((streamId) => {
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null

    Object.values(peersRef.current).forEach(peer => peer.destroy())
    peersRef.current = {}

    hlsInstanceRef.current?.destroy()
    hlsInstanceRef.current = null

    activeSocket.emit('stream:end', { streamId })
    activeSocket.off('stream:viewer_wants_offer')
    activeSocket.off('webrtc:answer')
    activeSocket.off('webrtc:ice_candidate')

    setIsHosting(false)
    setActiveStreamId(null)
    setStreamType(null)
  }, [activeSocket])

  // ─── LEAVE stream (viewer) ────────────────────────────────────
  const leaveStream = useCallback((streamId) => {
    Object.values(peersRef.current).forEach(peer => peer.destroy())
    peersRef.current = {}

    hlsInstanceRef.current?.destroy()
    hlsInstanceRef.current = null

    activeSocket.emit('stream:leave', { streamId })  // ← was using wrong socket
    activeSocket.off('webrtc:offer')
    activeSocket.off('webrtc:ice_candidate')

    setActiveStreamId(null)
    setStreamType(null)
  }, [activeSocket])

  const toggleMic = useCallback((enabled) => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = enabled })
  }, [])

  const toggleCamera = useCallback((enabled) => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = enabled })
  }, [])

  return (
    <LiveStreamContext.Provider value={{
      getSocket,
      localStreamRef,
      isHosting,
      activeStreamId,
      streamType,
      startStream,
      joinStream,
      receiveOffer,
      loadHLSStream,
      endStream,
      leaveStream,
      toggleMic,
      toggleCamera,
    }}>
      {children}
    </LiveStreamContext.Provider>
  )
}

export function useLiveStream() {
  const ctx = useContext(LiveStreamContext)
  if (!ctx) throw new Error('useLiveStream must be used inside LiveStreamProvider')
  return ctx
}