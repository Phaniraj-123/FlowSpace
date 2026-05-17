import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import Avatar from '../components/Avatar'
import { Heart, MessageCircle, ArrowLeft, ChevronDown, ChevronUp, CornerDownRight } from 'lucide-react'
import API from "../api"

export default function PostDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { token, user } = useAuthStore()
  const headers = { Authorization: `Bearer ${token}` }
  const [post, setPost] = useState(null)
  const [commentText, setCommentText] = useState('')
  const [replyText, setReplyText] = useState({})
  const [replyingTo, setReplyingTo] = useState(null)
  const [expandedReplies, setExpandedReplies] = useState({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { fetchPost() }, [id])

  async function fetchPost() {
    try {
      const res = await axios.get(`${API}/api/feed/${id}`, { headers })
      setPost(res.data)
    } catch (err) { console.log(err) }
    finally { setLoading(false) }
  }

  async function likePost() {
    try {
      await axios.post(`${API}/api/feed/${id}/like`, {}, { headers })
      fetchPost()
    } catch (err) { console.log(err) }
  }

  async function submitComment() {
    if (!commentText.trim() || submitting) return
    setSubmitting(true)
    try {
      await axios.post(`${API}/api/feed/${id}/comments`, { text: commentText }, { headers })
      setCommentText('')
      fetchPost()
    } catch (err) { console.log(err) }
    finally { setSubmitting(false) }
  }

  async function submitReply(commentId, username) {
    const text = replyText[commentId]
    if (!text?.trim() || submitting) return
    setSubmitting(true)
    try {
      await axios.post(`${API}/api/feed/${id}/comments`,
        { text: `@${username} ${text}`, parentComment: commentId },
        { headers })
      setReplyText({ ...replyText, [commentId]: '' })
      setReplyingTo(null)
      // auto-expand replies after posting
      setExpandedReplies(prev => ({ ...prev, [commentId]: true }))
      fetchPost()
    } catch (err) { console.log(err) }
    finally { setSubmitting(false) }
  }

  async function likeComment(commentId) {
    try {
      await axios.post(`${API}/api/feed/${id}/comments/${commentId}/like`, {}, { headers })
      fetchPost()
    } catch (err) { console.log(err) }
  }

  function toggleReplies(commentId) {
    setExpandedReplies(prev => ({ ...prev, [commentId]: !prev[commentId] }))
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 80, color: 'var(--text2)' }}>Loading...</div>
  if (!post) return <div style={{ textAlign: 'center', padding: 80, color: 'var(--text2)' }}>Post not found</div>

  const isLiked = post.likes?.includes(user?.id)
  const topLevelComments = post.comments?.filter(c => !c.parentComment) || []
  const getReplies = (commentId) => post.comments?.filter(c =>
    c.parentComment?.toString() === commentId?.toString()
  ) || []

  return (
    <>
      <style>{`
        .comment-card {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 14px 16px;
          transition: border-color 0.15s;
        }
        .reply-card {
          background: var(--bg3);
          border-radius: 10px;
          padding: 10px 14px;
        }
        .thread-line {
          width: 2px;
          background: var(--border);
          border-radius: 2px;
          margin: 0 auto;
          flex-shrink: 0;
        }
        .action-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 8px;
          transition: background 0.1s, color 0.1s;
        }
        .action-btn:hover { background: var(--bg3); }
        .reply-input {
          width: 100%;
          padding: 8px 12px;
          background: var(--bg2);
          border: 1px solid var(--border2);
          border-radius: 8px;
          color: var(--text);
          font-size: 13px;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s;
        }
        .reply-input:focus { border-color: var(--indigo); }
      `}</style>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px 100px' }}>

        {/* Back */}
        <button onClick={() => navigate(-1)} style={{
          background: 'none', border: 'none', color: 'var(--text2)',
          cursor: 'pointer', fontSize: 14, marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 6, padding: 0
        }}>
          <ArrowLeft size={16} /> Back
        </button>

        {/* Post card */}
        <div className="fade-up" style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 16, padding: 20, marginBottom: 16
        }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
            <Avatar src={post.author?.avatar} name={post.author?.username} size={40} />
            <div>
              <p onClick={() => navigate(`/user/${post.author?.username}`)}
                style={{ fontWeight: 700, fontSize: 15, marginBottom: 2, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--indigo-light)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text)'}
              >{post.author?.username}</p>
              <p style={{ color: 'var(--text2)', fontSize: 12 }}>
                {new Date(post.createdAt).toLocaleDateString('en-US', {
                  month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>
          </div>

          <p style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--text)', marginBottom: 16 }}>
            {post.content}
          </p>

          {post.image && (
            <img src={post.image} alt="post" style={{
              width: '100%', borderRadius: 12, marginBottom: 16,
              maxHeight: 400, objectFit: 'cover'
            }} />
          )}

          <div style={{
            display: 'flex', gap: 16, borderTop: '1px solid var(--border)', paddingTop: 14
          }}>
            <button onClick={likePost} style={{
              background: isLiked ? '#f43f5e11' : 'none',
              border: 'none', color: isLiked ? '#f43f5e' : 'var(--text2)',
              cursor: 'pointer', fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 20
            }}>
              <Heart size={15} fill={isLiked ? '#f43f5e' : 'none'} /> {post.likes?.length || 0}
            </button>
            <span style={{
              color: 'var(--text2)', fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px'
            }}>
              <MessageCircle size={15} /> {post.comments?.length || 0}
            </span>
          </div>
        </div>

        {/* Comment input */}
        <div className="fade-up-2" style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 14, padding: 16, marginBottom: 24
        }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <Avatar src={user?.avatar} name={user?.username} size={36} />
            <div style={{ flex: 1 }}>
              <input
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitComment()}
                placeholder="Write a comment..."
                className="reply-input"
                style={{ marginBottom: 10 }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={submitComment} disabled={submitting} style={{
                  padding: '7px 18px', background: 'var(--indigo)',
                  color: '#fff', border: 'none', borderRadius: 8,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  opacity: submitting ? 0.7 : 1
                }}>
                  {submitting ? 'Posting...' : 'Comment'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Comments section */}
        <h3 style={{
          fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700,
          marginBottom: 14, color: 'var(--text)'
        }}>
          {topLevelComments.length} Comment{topLevelComments.length !== 1 ? 's' : ''}
        </h3>

        {topLevelComments.length === 0 && (
          <div style={{
            textAlign: 'center', padding: 40, color: 'var(--text2)',
            background: 'var(--bg2)', borderRadius: 14, border: '1px solid var(--border)'
          }}>
            <p style={{ fontSize: 24, marginBottom: 8 }}>💬</p>
            <p>No comments yet. Start the conversation!</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {topLevelComments.map((comment, i) => {
            const replies = getReplies(comment._id)
            const isCommentLiked = comment.likes?.includes(user?.id)
            const isReplying = replyingTo === comment._id
            const repliesExpanded = expandedReplies[comment._id]

            return (
              <div key={comment._id} className="fade-up" style={{ animationDelay: `${i * 0.04}s` }}>

                {/* Main comment */}
                <div className="comment-card">
                  <div style={{ display: 'flex', gap: 10 }}>
                    <Avatar src={comment.user?.avatar} name={comment.user?.username} size={34} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{comment.user?.username}</span>
                        <span style={{ fontSize: 11, color: 'var(--text2)' }}>
                          {new Date(comment.createdAt).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric'
                          })}
                        </span>
                      </div>
                      <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6, marginBottom: 10 }}>
                        {comment.text}
                      </p>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <button className="action-btn" onClick={() => likeComment(comment._id)}
                          style={{ color: isCommentLiked ? '#f43f5e' : 'var(--text2)' }}>
                          <Heart size={12} fill={isCommentLiked ? '#f43f5e' : 'none'} />
                          {comment.likes?.length || 0}
                        </button>
                        <button className="action-btn" onClick={() => setReplyingTo(isReplying ? null : comment._id)}
                          style={{ color: isReplying ? 'var(--indigo-light)' : 'var(--text2)' }}>
                          <CornerDownRight size={12} />
                          {isReplying ? 'Cancel' : 'Reply'}
                        </button>
                        {replies.length > 0 && (
                          <button className="action-btn" onClick={() => toggleReplies(comment._id)}
                            style={{ color: 'var(--indigo-light)', marginLeft: 'auto' }}>
                            {repliesExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reply input */}
                {isReplying && (
                  <div style={{ display: 'flex', marginTop: 6, gap: 0 }}>
                    {/* Thread connector */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 28, flexShrink: 0 }}>
                      <div className="thread-line" style={{ height: '100%', minHeight: 40 }} />
                    </div>
                    <div style={{ flex: 1, paddingBottom: 6 }}>
                      <div style={{
                        background: 'var(--bg2)', border: '1px solid var(--indigo)44',
                        borderRadius: 12, padding: 12
                      }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Avatar src={user?.avatar} name={user?.username} size={28} />
                          <div style={{ flex: 1 }}>
                            <input
                              value={replyText[comment._id] || ''}
                              onChange={e => setReplyText({ ...replyText, [comment._id]: e.target.value })}
                              onKeyDown={e => e.key === 'Enter' && submitReply(comment._id, comment.user?.username)}
                              placeholder={`Reply to @${comment.user?.username}...`}
                              autoFocus
                              className="reply-input"
                              style={{ marginBottom: 8 }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                              <button onClick={() => setReplyingTo(null)} style={{
                                padding: '5px 12px', background: 'none',
                                color: 'var(--text2)', border: '1px solid var(--border2)',
                                borderRadius: 8, fontSize: 12, cursor: 'pointer'
                              }}>Cancel</button>
                              <button onClick={() => submitReply(comment._id, comment.user?.username)}
                                disabled={submitting} style={{
                                  padding: '5px 14px', background: 'var(--indigo)',
                                  color: '#fff', border: 'none', borderRadius: 8,
                                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                  opacity: submitting ? 0.7 : 1
                                }}>Reply</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Replies tree */}
                {repliesExpanded && replies.length > 0 && (
                  <div style={{ display: 'flex', marginTop: 4 }}>
                    {/* Vertical thread line */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 28, flexShrink: 0 }}>
                      <div className="thread-line" style={{ height: '100%' }} />
                    </div>
                    {/* Replies */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 4 }}>
                      {replies.map((reply, ri) => {
                        const isReplyLiked = reply.likes?.includes(user?.id)
                        const subReplies = getReplies(reply._id)
                        const subExpanded = expandedReplies[reply._id]
                        const isReplyingToReply = replyingTo === reply._id

                        return (
                          <div key={reply._id}>
                            <div className="reply-card">
                              <div style={{ display: 'flex', gap: 8 }}>
                                <Avatar src={reply.user?.avatar} name={reply.user?.username} size={28} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: 700, fontSize: 12 }}>{reply.user?.username}</span>
                                    <span style={{ fontSize: 11, color: 'var(--text2)' }}>
                                      {new Date(reply.createdAt).toLocaleDateString('en-US', {
                                        month: 'short', day: 'numeric'
                                      })}
                                    </span>
                                  </div>
                                  <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, marginBottom: 8 }}>
                                    {reply.text}
                                  </p>
                                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                    <button className="action-btn" onClick={() => likeComment(reply._id)}
                                      style={{ color: isReplyLiked ? '#f43f5e' : 'var(--text2)' }}>
                                      <Heart size={11} fill={isReplyLiked ? '#f43f5e' : 'none'} />
                                      {reply.likes?.length || 0}
                                    </button>
                                    {/* Reply to a reply goes back to parent comment thread */}
                                    <button className="action-btn"
                                      onClick={() => setReplyingTo(isReplyingToReply ? null : comment._id)}
                                      style={{ color: 'var(--text2)' }}>
                                      <CornerDownRight size={11} /> Reply
                                    </button>
                                    {subReplies.length > 0 && (
                                      <button className="action-btn" onClick={() => toggleReplies(reply._id)}
                                        style={{ color: 'var(--indigo-light)', marginLeft: 'auto' }}>
                                        {subExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                        {subReplies.length} more
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Sub-replies (replies to replies) */}
                            {subExpanded && subReplies.length > 0 && (
                              <div style={{ display: 'flex', marginTop: 4, paddingLeft: 8 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24, flexShrink: 0 }}>
                                  <div className="thread-line" style={{ height: '100%' }} />
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                                  {subReplies.map(subReply => {
                                    const isSubReplyLiked = subReply.likes?.includes(user?.id)
                                    return (
                                      <div key={subReply._id} style={{
                                        background: 'var(--bg2)', border: '1px solid var(--border)',
                                        borderRadius: 8, padding: '8px 12px'
                                      }}>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                          <Avatar src={subReply.user?.avatar} name={subReply.user?.username} size={24} />
                                          <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                                              <span style={{ fontWeight: 700, fontSize: 11 }}>{subReply.user?.username}</span>
                                              <span style={{ fontSize: 10, color: 'var(--text2)' }}>
                                                {new Date(subReply.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                              </span>
                                            </div>
                                            <p style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.6, marginBottom: 6 }}>
                                              {subReply.text}
                                            </p>
                                            <button className="action-btn" onClick={() => likeComment(subReply._id)}
                                              style={{ color: isSubReplyLiked ? '#f43f5e' : 'var(--text2)' }}>
                                              <Heart size={10} fill={isSubReplyLiked ? '#f43f5e' : 'none'} />
                                              {subReply.likes?.length || 0}
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}