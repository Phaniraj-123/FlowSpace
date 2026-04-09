import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import Avatar from '../components/Avatar'
import API from "../api"

export default function PostDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { token, user } = useAuthStore()
    console.log('token:', token)
    const headers = { Authorization: `Bearer ${token}` }
    const [post, setPost] = useState(null)
    const [commentText, setCommentText] = useState('')
    const [replyText, setReplyText] = useState({}) // { commentId: text }
    const [replyingTo, setReplyingTo] = useState(null) // commentId
    const [loading, setLoading] = useState(true)

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
        if (!commentText.trim()) return
        try {
            await axios.post(`${API}/api/feed/${id}/comments`,
                { text: commentText },
                { headers }) // ← headers here too
            setCommentText('')
            fetchPost()
        } catch (err) { console.log(err) }
    }

    async function submitReply(commentId, username) {
        const text = replyText[commentId]
        if (!text?.trim()) return
        try {
            await axios.post(`${API}/api/feed/${id}/comments`,
                { text: `@${username} ${text}`, parentComment: commentId },
                { headers }) // ← headers is here
            setReplyText({ ...replyText, [commentId]: '' })
            setReplyingTo(null)
            fetchPost()
        } catch (err) { console.log(err) }
    }

    async function likeComment(commentId) {
        try {
            await axios.post(`${API}/api/feed/${id}/comments/${commentId}/like`,
                {}, { headers })
            fetchPost()
        } catch (err) { console.log(err) }
    }

    

    if (loading) return (
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--text2)' }}>Loading...</div>
    )

    if (!post) return (
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--text2)' }}>Post not found</div>
    )

    const isLiked = post.likes?.includes(user?.id)

    // separate top-level comments and replies
    const topLevelComments = post.comments?.filter(c => !c.parentComment) || []
    const getReplies = (commentId) => post.comments?.filter(c =>
        c.parentComment?.toString() === commentId?.toString()
    ) || []

    return (
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 24px 100px' }}>

            {/* Back */}
            <button onClick={() => navigate('/feed')} style={{
                background: 'none', border: 'none', color: 'var(--text2)',
                cursor: 'pointer', fontSize: 14, marginBottom: 20,
                display: 'flex', alignItems: 'center', gap: 6, padding: 0
            }}>← Back to Feed</button>

            {/* Post */}
            <div className="fade-up" style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 16, padding: 24, marginBottom: 20
            }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    <Avatar src={user?.avatar} name={user?.username} size={38} />
                    <div>
                        <p onClick={() => navigate(`/user/${post.author?.username}`)}
                            style={{ fontWeight: 700, fontSize: 15, marginBottom: 2, cursor: 'pointer' }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--indigo-light)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text)'}
                        >{post.author?.username}</p>
                        <p style={{ color: 'var(--text2)', fontSize: 12 }}>
                            {new Date(post.createdAt).toLocaleDateString('en-US', {
                                month: 'long', day: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                            })}
                        </p>
                    </div>
                </div>

                <p style={{ fontSize: 16, lineHeight: 1.8, color: 'var(--text)', marginBottom: 20 }}>
                    {post.content}
                </p>

                {post.image && (
                    <img src={post.image} alt="post" style={{
                        width: '100%', borderRadius: 12, marginBottom: 16,
                        maxHeight: 400, objectFit: 'cover'
                    }} />
                )}

                <div style={{ display: 'flex', gap: 20, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                    <button onClick={likePost} style={{
                        background: 'none', border: 'none',
                        color: isLiked ? '#f43f5e' : 'var(--text2)',
                        cursor: 'pointer', fontSize: 14, fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: 6
                    }}>
                        {isLiked ? '❤️' : '🤍'} {post.likes?.length || 0} Likes
                    </button>
                    <span style={{ color: 'var(--text2)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                        💬 {post.comments?.length || 0} Comments
                    </span>
                </div>
            </div>

            {/* Add comment */}
            <div className="fade-up-2" style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 16, padding: 16, marginBottom: 20
            }}>
                <div style={{ display: 'flex', gap: 10 }}>
                    <Avatar src={user?.avatar} name={user?.username} size={38} />
                    <div style={{ flex: 1 }}>
                        <input
                            value={commentText}
                            onChange={e => setCommentText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && submitComment()}
                            placeholder="Write a comment..."
                            style={{
                                width: '100%', padding: '10px 14px',
                                background: 'var(--bg3)', border: '1px solid var(--border2)',
                                borderRadius: 10, color: 'var(--text)', fontSize: 14,
                                outline: 'none', marginBottom: 10
                            }}
                            onFocus={e => e.target.style.borderColor = 'var(--indigo)'}
                            onBlur={e => e.target.style.borderColor = 'var(--border2)'}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={submitComment} style={{
                                padding: '8px 20px', background: 'var(--indigo)',
                                color: '#fff', border: 'none', borderRadius: 8,
                                fontSize: 14, fontWeight: 600, cursor: 'pointer'
                            }}>Comment</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Comments */}
            <h3 style={{
                fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700,
                marginBottom: 16, color: 'var(--text)'
            }}>
                {post.comments?.length || 0} Comments
            </h3>

            {topLevelComments.length === 0 && (
                <div style={{
                    textAlign: 'center', padding: 40, color: 'var(--text2)',
                    background: 'var(--bg2)', borderRadius: 16, border: '1px solid var(--border)'
                }}>
                    <p style={{ fontSize: 24, marginBottom: 8 }}>💬</p>
                    <p>No comments yet. Start the conversation!</p>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {topLevelComments.map((comment, i) => {
                    const replies = getReplies(comment._id)
                    const isCommentLiked = comment.likes?.includes(user?.id)
                    const isReplying = replyingTo === comment._id

                    return (
                        <div key={comment._id} className="fade-up" style={{
                            animationDelay: `${i * 0.04}s`
                        }}>
                            {/* Comment */}
                            <div style={{
                                background: 'var(--bg2)', border: '1px solid var(--border)',
                                borderRadius: 14, padding: 16
                            }}>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <Avatar src={user?.avatar} name={user?.username} size={38} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
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
                                        <div style={{ display: 'flex', gap: 16 }}>
                                            <button onClick={() => likeComment(comment._id)} style={{
                                                background: 'none', border: 'none',
                                                color: isCommentLiked ? '#f43f5e' : 'var(--text2)',
                                                cursor: 'pointer', fontSize: 12, fontWeight: 600,
                                                display: 'flex', alignItems: 'center', gap: 4
                                            }}>
                                                {isCommentLiked ? '❤️' : '🤍'} {comment.likes?.length || 0}
                                            </button>
                                            <button onClick={() => setReplyingTo(isReplying ? null : comment._id)} style={{
                                                background: 'none', border: 'none',
                                                color: isReplying ? 'var(--indigo-light)' : 'var(--text2)',
                                                cursor: 'pointer', fontSize: 12, fontWeight: 600
                                            }}>
                                                {isReplying ? 'Cancel' : 'Reply'}
                                            </button>
                                            {replies.length > 0 && (
                                                <span style={{ fontSize: 12, color: 'var(--text2)' }}>
                                                    {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Replies */}
                            {replies.length > 0 && (
                                <div style={{ marginLeft: 28, marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {replies.map((reply, ri) => {
                                        const isReplyLiked = reply.likes?.includes(user?.id)
                                        return (
                                            <div key={reply._id} style={{
                                                background: 'var(--bg3)', border: '1px solid var(--border)',
                                                borderRadius: 12, padding: 14,
                                                borderLeft: '2px solid var(--indigo)44'
                                            }}>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <Avatar src={user?.avatar} name={user?.username} size={38} />
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
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
                                                        {/* Like + reply buttons on replies */}
                                                        <div style={{ display: 'flex', gap: 14 }}>
                                                            <button onClick={() => likeComment(reply._id)} style={{
                                                                background: 'none', border: 'none',
                                                                color: isReplyLiked ? '#f43f5e' : 'var(--text2)',
                                                                cursor: 'pointer', fontSize: 12, fontWeight: 600,
                                                                display: 'flex', alignItems: 'center', gap: 4
                                                            }}>
                                                                {isReplyLiked ? '❤️' : '🤍'} {reply.likes?.length || 0}
                                                            </button>
                                                            <button onClick={() => setReplyingTo(isReplying ? null : comment._id)} style={{
                                                                background: 'none', border: 'none',
                                                                color: 'var(--text2)', cursor: 'pointer',
                                                                fontSize: 12, fontWeight: 600
                                                            }}>
                                                                Reply
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            {/* Reply input */}
                            {isReplying && (
                                <div style={{
                                    marginLeft: 28, marginTop: 8,
                                    background: 'var(--bg2)', border: '1px solid var(--indigo)33',
                                    borderRadius: 12, padding: 12,
                                    borderLeft: '2px solid var(--indigo)'
                                }}>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <Avatar src={user?.avatar} name={user?.username} size={38} />
                                        <div style={{ flex: 1 }}>
                                            <input
                                                value={replyText[comment._id] || ''}
                                                onChange={e => setReplyText({ ...replyText, [comment._id]: e.target.value })}
                                                onKeyDown={e => e.key === 'Enter' && submitReply(comment._id, comment.user?.username)}
                                                placeholder={`Reply to @${comment.user?.username}...`}
                                                autoFocus
                                                style={{
                                                    width: '100%', padding: '8px 12px',
                                                    background: 'var(--bg3)', border: '1px solid var(--border2)',
                                                    borderRadius: 8, color: 'var(--text)', fontSize: 13,
                                                    outline: 'none', marginBottom: 8
                                                }}
                                                onFocus={e => e.target.style.borderColor = 'var(--indigo)'}
                                                onBlur={e => e.target.style.borderColor = 'var(--border2)'}
                                            />
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                                <button onClick={() => setReplyingTo(null)} style={{
                                                    padding: '6px 14px', background: 'none',
                                                    color: 'var(--text2)', border: '1px solid var(--border2)',
                                                    borderRadius: 8, fontSize: 13, cursor: 'pointer'
                                                }}>Cancel</button>
                                                <button onClick={() => submitReply(comment._id, comment.user?.username)} style={{
                                                    padding: '6px 14px', background: 'var(--indigo)',
                                                    color: '#fff', border: 'none', borderRadius: 8,
                                                    fontSize: 13, fontWeight: 600, cursor: 'pointer'
                                                }}>Reply</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}