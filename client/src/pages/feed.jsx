import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import { Heart, MessageCircle, Image, Trash2, Share2, Link, Zap, X, Plus } from 'lucide-react'
import Avatar, { TierBadge } from '../components/Avatar'
import ImageViewer from '../components/ImageViewer'
import API from "../api"

export default function Feed() {
  const [posts, setPosts] = useState([])
  const [mediaFile, setMediaFile] = useState(null)
  const [mediaPreview, setMediaPreview] = useState(null)
  const fileRef = useRef(null)
  const [content, setContent] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedPost, setExpandedPost] = useState(null)
  const [commentText, setCommentText] = useState('')
  const { token, user } = useAuthStore()
  const [sharePostId, setSharePostId] = useState(null)
  const [showDMModal, setShowDMModal] = useState(false)
  const [sharePost, setSharePost] = useState(null)
  const [conversations, setConversations] = useState([])
  const headers = { Authorization: `Bearer ${token}` }
  const [viewerSrc, setViewerSrc] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const navigate = useNavigate()

  // expose openCreate globally so Navbar + button can trigger it
  useEffect(() => {
    window.__openCreatePost = () => setShowCreateModal(true)
    return () => { delete window.__openCreatePost }
  }, [])

  useEffect(() => { fetchFeed(); fetchSuggestions() }, [])

  async function fetchFeed() {
    try {
      const res = await axios.get('https://flowspace-3ief.onrender.com/api/feed', { headers })
      setPosts(res.data.posts)
    } catch (err) { console.log(err) }
    finally { setLoading(false) }
  }

  async function fetchSuggestions() {
    try {
      const res = await axios.get('https://flowspace-3ief.onrender.com/api/users/me/suggestions', { headers })
      setSuggestions(res.data)
    } catch (err) { console.log(err) }
  }

  async function createPost(e) {
    e.preventDefault()
    if (!content.trim() && !mediaFile) return
    try {
      const formData = new FormData()
      formData.append('content', content)
      if (mediaFile) formData.append('media', mediaFile)
      const res = await axios.post('https://flowspace-3ief.onrender.com/api/feed', formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' }
      })
      setPosts([res.data, ...posts])
      setContent('')
      setMediaFile(null)
      setMediaPreview(null)
      setShowCreateModal(false)
    } catch (err) { console.log(err) }
  }

  async function likePost(postId) {
    try {
      const res = await axios.post(`${API}/api/feed/${postId}/like`, {}, { headers })
      setPosts(posts.map(p => p._id === postId ? {
        ...p,
        likes: res.data.isLiked
          ? [...p.likes, user.id]
          : p.likes.filter(id => id !== user.id)
      } : p))
    } catch (err) { console.log(err) }
  }

  async function submitComment(postId) {
    if (!commentText.trim()) return
    try {
      const res = await axios.post(`${API}/api/feed/${postId}/comments`,
        { text: commentText }, { headers })
      setPosts(posts.map(p => p._id === postId ? res.data : p))
      setCommentText('')
    } catch (err) { console.log(err) }
  }

  async function followUser(userId) {
    try {
      await axios.post(`${API}/api/users/${userId}/follow`, {}, { headers })
      setSuggestions(suggestions.filter(s => s._id !== userId))
    } catch (err) { console.log(err) }
  }

  async function deletePost(postId) {
    if (!confirm('Delete this post?')) return
    try {
      await axios.delete(`${API}/api/feed/${postId}`, { headers })
      setPosts(prev => prev.filter(p => p._id !== postId))
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete')
    }
  }

  function copyLink(postId) {
    navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`)
    setSharePostId(null)
    alert('✅ Link copied!')
  }

  async function shareToFollowers(postId) {
    setSharePost(postId)
    setSharePostId(null)
    try {
      const res = await axios.get('https://flowspace-3ief.onrender.com/api/messages/conversations', { headers })
      setConversations(res.data)
    } catch (err) { console.log(err) }
    setShowDMModal(true)
  }

  async function sendPostDM(conversationId) {
    try {
      const postUrl = `${window.location.origin}/post/${sharePost}`
      await axios.post(`${API}/api/messages/${conversationId}`,
        { content: `Check out this post: ${postUrl}` }, { headers })
      setShowDMModal(false)
      alert('✅ Shared!')
    } catch (err) { console.log(err) }
  }

  async function nativeShare(post) {
    try {
      await navigator.share({
        title: `${post.author?.username} on FlowSpace`,
        text: post.content?.slice(0, 100),
        url: `${window.location.origin}/post/${post._id}`
      })
    } catch (err) { console.log(err) }
    setSharePostId(null)
  }

  return (
    <>
      <style>{`
        .feed-layout {
          max-width: 1000px;
          margin: 0 auto;
          padding: 24px 16px 100px;
          display: grid;
          grid-template-columns: 1fr 280px;
          gap: 24px;
        }
        @media (max-width: 768px) {
          .feed-layout {
            grid-template-columns: 1fr;
            padding: 16px 12px 100px;
          }
          .feed-sidebar { display: none; }
        }
        .post-card {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 16px;
          transition: border-color 0.15s;
        }
        .post-card:hover { border-color: var(--indigo)33; }
      `}</style>

      <div className="feed-layout">
        {/* Main Feed */}
        <div>
          <h1 className="fade-up" style={{
            fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800,
            marginBottom: 20, color: 'var(--text)'
          }}>Feed</h1>

          {loading && (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text2)' }}>Loading feed...</div>
          )}
          {!loading && posts.length === 0 && (
            <div style={{
              textAlign: 'center', padding: 60, color: 'var(--text2)',
              background: 'var(--bg2)', borderRadius: 16, border: '1px solid var(--border)'
            }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>...</div>
              <p style={{ fontWeight: 600, marginBottom: 6 }}>Nothing here yet</p>
              <p style={{ fontSize: 14 }}>Follow some users or tap + to create your first post!</p>
            </div>
          )}

          {posts.map((post, i) => {
            const isExpanded = expandedPost === post._id
            const isLiked = post.likes?.includes(user?.id)
            const isOwner = post.author?._id === user?._id || post.author?._id === user?.id || post.author === user?._id || post.author === user?.id

            return (
              <div key={post._id} className="post-card fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
                {/* Author */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                  <Avatar src={post.author?.avatar} name={post.author?.username} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                      <p onClick={() => navigate(`/user/${post.author?.username}`)}
                        style={{ fontWeight: 600, fontSize: 14, marginBottom: 2, cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--indigo-light)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text)'}
                      >{post.author?.username}</p>
                      <TierBadge tier={post.author?.subscriptionTier} />
                    </div>
                    <p style={{ color: 'var(--text2)', fontSize: 12 }}>
                      {new Date(post.createdAt).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>

                {/* Boost */}
                {isOwner && !post.isBoosted && (
                  <button onClick={async (e) => {
                    e.stopPropagation()
                    try {
                      await axios.post(`${API}/api/monetization/boost/${post._id}`, {}, { headers })
                      alert('⚡ Post boosted for 24 hours!')
                    } catch (err) {
                      alert(err.response?.data?.error || 'Boost failed')
                    }
                  }} style={{
                    background: 'none', border: 'none', color: 'var(--text2)',
                    cursor: 'pointer', fontSize: 12, display: 'flex',
                    alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 8, marginBottom: 8
                  }}>
                    <Zap size={13} /> Boost
                  </button>
                )}
                {post.isBoosted && (
                  <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700, display: 'block', marginBottom: 8 }}>⚡ Boosted</span>
                )}

                {/* Content */}
                <p style={{ lineHeight: 1.75, fontSize: 15, color: 'var(--text)', marginBottom: 16 }}>
                  {post.content}
                </p>

                {post.image && (
                  <img src={post.image} alt="post"
                    onClick={() => setViewerSrc(post.image)}
                    style={{
                      width: '100%', borderRadius: 12, marginBottom: 16,
                      maxHeight: 420, objectFit: 'contain', cursor: 'zoom-in',
                      background: 'var(--bg3)'
                    }}
                  />
                )}
                {post.video && (
                  <video src={post.video} controls style={{
                    width: '100%', borderRadius: 12, marginBottom: 16, maxHeight: 420
                  }} />
                )}

                {/* Actions */}
                <div style={{
                  display: 'flex', gap: 8, alignItems: 'center',
                  borderTop: '1px solid var(--border)',
                  paddingTop: 14, marginBottom: isExpanded ? 16 : 0
                }}>
                  <button onClick={() => likePost(post._id)} style={{
                    background: 'none', border: 'none',
                    color: isLiked ? '#f43f5e' : 'var(--text2)',
                    cursor: 'pointer', fontSize: 13,
                    display: 'flex', alignItems: 'center', gap: 6, transition: 'color 0.15s',
                    padding: '6px 10px', borderRadius: 20,
                    background: isLiked ? '#f43f5e11' : 'none'
                  }}>
                    <Heart size={15} fill={isLiked ? '#f43f5e' : 'none'} /> {post.likes?.length || 0}
                  </button>

                  <button onClick={() => navigate(`/post/${post._id}`)} style={{
                    background: 'none', border: 'none', color: 'var(--text2)',
                    cursor: 'pointer', fontSize: 13,
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 10px', borderRadius: 20
                  }}>
                    <MessageCircle size={15} /> {post.comments?.length || 0}
                  </button>

                  <div style={{ flex: 1 }} />

                  {(isOwner || user?.isAdmin) && (
                    <button onClick={() => deletePost(post._id)} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text2)', display: 'flex', alignItems: 'center',
                      padding: '6px 10px', borderRadius: 20, transition: 'color 0.15s'
                    }}
                      onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text2)'}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}

                  <div style={{ position: 'relative' }}>
                    <button onClick={() => setSharePostId(sharePostId === post._id ? null : post._id)} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text2)', display: 'flex', alignItems: 'center',
                      padding: '6px 10px', borderRadius: 20, transition: 'color 0.15s'
                    }}>
                      <Share2 size={15} />
                    </button>

                    {sharePostId === post._id && (
                      <div style={{
                        position: 'absolute', bottom: 36, right: 0,
                        background: 'var(--bg)', border: '1px solid var(--border)',
                        borderRadius: 12, padding: 8, zIndex: 50,
                        minWidth: 180, boxShadow: '0 8px 24px #0006'
                      }}>
                        <button onClick={() => copyLink(post._id)} style={{
                          width: '100%', padding: '9px 12px', background: 'none',
                          border: 'none', cursor: 'pointer', color: 'var(--text)',
                          fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
                          borderRadius: 8, textAlign: 'left'
                        }}>
                          <Link size={14} /> Copy Link
                        </button>
                        <button onClick={() => shareToFollowers(post._id)} style={{
                          width: '100%', padding: '9px 12px', background: 'none',
                          border: 'none', cursor: 'pointer', color: 'var(--text)',
                          fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
                          borderRadius: 8, textAlign: 'left'
                        }}>
                          <MessageCircle size={14} /> Share to DM
                        </button>
                        {navigator.share && (
                          <button onClick={() => nativeShare(post)} style={{
                            width: '100%', padding: '9px 12px', background: 'none',
                            border: 'none', cursor: 'pointer', color: 'var(--text)',
                            fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
                            borderRadius: 8, textAlign: 'left'
                          }}>
                            <Share2 size={14} /> Share via...
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Comments */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                    {post.comments?.length > 0 && (
                      <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {post.comments.map((comment, ci) => (
                          <div key={ci} style={{ display: 'flex', gap: 10 }}>
                            <Avatar src={comment.user?.avatar} name={comment.user?.username} size={32} />
                            <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: '8px 12px', flex: 1 }}>
                              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--indigo-light)', marginBottom: 4 }}>
                                {comment.user?.username}
                              </p>
                              <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{comment.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {post.comments?.length === 0 && (
                      <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 16 }}>No comments yet.</p>
                    )}
                    <div style={{ display: 'flex', gap: 10 }}>
                      <Avatar src={user?.avatar} name={user?.username} size={32} />
                      <div style={{ flex: 1, display: 'flex', gap: 8 }}>
                        <input
                          value={commentText}
                          onChange={e => setCommentText(e.target.value)}
                          placeholder="Write a comment..."
                          onKeyDown={e => e.key === 'Enter' && submitComment(post._id)}
                          style={{
                            flex: 1, padding: '8px 12px',
                            background: 'var(--bg3)', border: '1px solid var(--border2)',
                            borderRadius: 8, color: 'var(--text)', fontSize: 13, outline: 'none'
                          }}
                        />
                        <button onClick={() => submitComment(post._id)} style={{
                          padding: '8px 14px', background: 'var(--indigo)',
                          color: '#fff', border: 'none', borderRadius: 8,
                          cursor: 'pointer', fontSize: 14, fontWeight: 600
                        }}>→</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Sidebar — hidden on mobile via CSS */}
        <div className="feed-sidebar">
          <div className="fade-up-3" style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 16, padding: 20, position: 'sticky', top: 80
          }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
              Who to follow
            </h3>
            {suggestions.length === 0 && (
              <p style={{ color: 'var(--text2)', fontSize: 13 }}>You're following everyone! 🎉</p>
            )}
            {suggestions.map(s => (
              <div key={s._id} style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', marginBottom: 14
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar src={s.avatar} name={s.username} size={34} tier={s.subscriptionTier} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600 }}>{s.username}</p>
                    {s.bio && <p style={{ fontSize: 11, color: 'var(--text2)' }}>{s.bio}</p>}
                  </div>
                </div>
                <button onClick={() => followUser(s._id)} style={{
                  padding: '5px 12px', background: 'var(--indigo-dim)',
                  color: 'var(--indigo-light)', border: '1px solid var(--indigo)44',
                  borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 600
                }}>Follow</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create Post Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
          zIndex: 9000, display: 'flex', alignItems: 'flex-end',
          justifyContent: 'center', padding: '0'
        }} onClick={() => setShowCreateModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: '24px 24px 0 0', padding: 24,
            width: '100%', maxWidth: 600,
            boxShadow: '0 -8px 40px #0008',
            animation: 'slideUp 0.25s ease'
          }}>
            {/* Handle */}
            <div style={{
              width: 40, height: 4, borderRadius: 2,
              background: 'var(--border2)', margin: '0 auto 20px'
            }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700 }}>Create Post</h3>
              <button onClick={() => setShowCreateModal(false)} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)'
              }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <Avatar src={user?.avatar} name={user?.username} size={40} tier={user?.subscriptionTier} />
              <form onSubmit={createPost} style={{ flex: 1 }}>
                <textarea
                  placeholder="What are you working on today? 🔥"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%', padding: '10px 0', background: 'none',
                    border: 'none', borderBottom: '1px solid var(--border)',
                    color: 'var(--text)', fontSize: 15, outline: 'none',
                    resize: 'none', minHeight: 80, lineHeight: 1.6,
                    fontFamily: 'var(--font-body)'
                  }}
                />
                {mediaPreview && (
                  <div style={{ position: 'relative', marginTop: 12 }}>
                    {mediaFile?.type.startsWith('video') ? (
                      <video src={mediaPreview} controls style={{ width: '100%', borderRadius: 10, maxHeight: 260 }} />
                    ) : (
                      <img src={mediaPreview} alt="preview" style={{ width: '100%', borderRadius: 10, maxHeight: 260, objectFit: 'cover' }} />
                    )}
                    <button onClick={() => { setMediaFile(null); setMediaPreview(null) }} style={{
                      position: 'absolute', top: 8, right: 8,
                      background: '#00000088', border: 'none', color: '#fff',
                      borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 14
                    }}>✕</button>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                  <input
                    ref={fileRef} type="file" accept="image/*,video/*"
                    style={{ display: 'none' }}
                    onChange={e => {
                      const file = e.target.files[0]
                      if (file) { setMediaFile(file); setMediaPreview(URL.createObjectURL(file)) }
                    }}
                  />
                  <button type="button" onClick={() => fileRef.current.click()} style={{
                    background: 'none', border: '1px solid var(--border2)',
                    color: 'var(--text2)', borderRadius: 8, padding: '7px 14px',
                    cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6
                  }}>
                    <Image size={14} /> Photo/Video
                  </button>
                  <button type="submit" style={{
                    padding: '9px 24px', background: 'var(--indigo)',
                    color: '#fff', border: 'none', borderRadius: 20,
                    fontSize: 14, fontWeight: 600, cursor: 'pointer'
                  }}>Post</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* DM Share Modal */}
      {showDMModal && (
        <div style={{
          position: 'fixed', inset: 0, background: '#00000088',
          zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={() => setShowDMModal(false)}>
          <div style={{
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 20, padding: 24, width: 340, maxHeight: 480, overflowY: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
              Share to DM
            </h3>
            {conversations.length === 0 && (
              <p style={{ color: 'var(--text2)', fontSize: 13 }}>No conversations yet</p>
            )}
            {conversations.map(conv => {
              const other = conv.participants?.find(p => p._id !== user?._id && p._id !== user?.id)
              return (
                <div key={conv._id} onClick={() => sendPostDM(conv._id)} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px', borderRadius: 12, cursor: 'pointer', transition: 'background 0.15s'
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <Avatar src={other?.avatar} name={other?.username} size={38} />
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{other?.username}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <ImageViewer src={viewerSrc} onClose={() => setViewerSrc(null)} />

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </>
  )
}