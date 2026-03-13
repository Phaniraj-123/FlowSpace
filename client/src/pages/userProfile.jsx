import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import { ArrowLeft, UserPlus, UserCheck, Heart, MessageCircle, Target, Timer, Clock } from 'lucide-react'
import Avatar from '../components/Avatar'


export default function UserProfile() {
  const { username } = useParams()
  const navigate = useNavigate()
  const { token, user: me } = useAuthStore()
  const headers = { Authorization: `Bearer ${token}` }
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [goals, setGoals] = useState([])
  const [stats, setStats] = useState(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [activeTab, setActiveTab] = useState('posts')
  const [loading, setLoading] = useState(true)
  const [showFollowers, setShowFollowers] = useState(false)
  const [showFollowing, setShowFollowing] = useState(false)
  const [subscription, setSubscription] = useState(null)
  const [showSubModal, setShowSubModal] = useState(false)





  useEffect(() => { fetchProfile(), console.log('profile', profile) }, [username])

  async function fetchProfile() {
    try {
      setLoading(true)
      const [profileRes, postsRes] = await Promise.all([
        axios.get(`http://localhost:5000/api/users/${username}`, { headers }),
        axios.get(`http://localhost:5000/api/feed/user/${username}`, { headers })
      ])
      setProfile(profileRes.data)
      setPosts(postsRes.data)
      setIsFollowing(profileRes.data.followers?.some(f => f._id === me?.id))

      const goalsRes = await axios.get(
        `http://localhost:5000/api/goals/user/${profileRes.data._id}`, { headers }
      )
      setGoals(goalsRes.data)
    } catch (err) { console.log(err) }
    finally { setLoading(false) }
  }



  async function toggleFollow() {
    try {
      if (isFollowing) {
        await axios.delete(`http://localhost:5000/api/users/${profile._id}/follow`, { headers })
      } else {
        await axios.post(`http://localhost:5000/api/users/${profile._id}/follow`, {}, { headers })
      }
      setIsFollowing(!isFollowing)
      fetchProfile()
    } catch (err) { console.log(err) }
  }

  // add subscribe function:
  // async function subscribe(tier) {
  //   try {
  //     const res = await axios.post(
  //       `http://localhost:5000/api/monetization/subscribe/${profile._id}`,
  //       { tier }, { headers }
  //     )
  //     setSubscription(res.data.subscription)
  //     setShowSubModal(false)
  //     alert(`✅ Subscribed as ${tier.toUpperCase()}!`)
  //   } catch (err) {
  //     alert(err.response?.data?.error || 'Subscription failed')
  //   }
  // }

  async function subscribe(tier) {
    try {
      // create order
      const orderRes = await axios.post('http://localhost:5000/api/plans/create-order',
        { plan: tier, creatorId: profile._id }, { headers })

      const { orderId, amount, currency, keyId } = orderRes.data

      // open razorpay
      const options = {
        key: keyId,
        amount,
        currency,
        name: 'FlowSpace',
        description: `${tier} subscription to ${profile.username}`,
        order_id: orderId,
        handler: async function (response) {
          // verify payment
          const verifyRes = await axios.post('http://localhost:5000/api/plans/verify', {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            creatorId: profile._id,
            plan: tier
          }, { headers })
          setSubscription({ tier })
          setShowSubModal(false)
          alert(`✅ Subscribed! ${verifyRes.data.message}`)
        },
        prefill: { name: user?.username, email: user?.email },
        theme: { color: '#6366f1' }
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (err) {
      alert(err.response?.data?.error || 'Subscription failed')
    }
  }

  // Followers/Following Modal
  const UserListModal = ({ title, users, onClose }) => (
    <div style={{
      position: 'fixed', inset: 0, background: '#00000088',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 20, padding: 24, width: '100%', maxWidth: 400,
        maxHeight: '70vh', overflow: 'hidden', display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--text2)',
            cursor: 'pointer', fontSize: 20
          }}>✕</button>
        </div>

        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {users?.length === 0 && (
            <p style={{ color: 'var(--text2)', textAlign: 'center', padding: 20 }}>No users yet</p>
          )}
          {users?.map(u => (
            <div key={u._id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div
                onClick={() => { onClose(); navigate(`/user/${u.username}`) }}
                style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
              >
                <Avatar src={u.avatar} name={u.username} size={40} />
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{u.username}</p>
                  {u.bio && <p style={{ fontSize: 12, color: 'var(--text2)' }}>{u.bio}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 80, color: 'var(--text2)' }}>Loading...</div>
  )

  if (!profile) return (
    <div style={{ textAlign: 'center', padding: 80, color: 'var(--text2)' }}>User not found</div>
  )

  const isOwnProfile = me?.username === username

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 24px 100px' }}>

      {/* Modals */}
      {showFollowers && (
        <UserListModal
          title={`Followers (${profile.followers?.length || 0})`}
          users={profile.followers}
          onClose={() => setShowFollowers(false)}
        />
      )}
      {showFollowing && (
        <UserListModal
          title={`Following (${profile.following?.length || 0})`}
          users={profile.following}
          onClose={() => setShowFollowing(false)}
        />
      )}

      {/* Back */}
      <button onClick={() => navigate(-1)} style={{
        background: 'none', border: 'none', color: 'var(--text2)',
        cursor: 'pointer', fontSize: 14, marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 6, padding: 0
      }}>
        <ArrowLeft size={16} /> Back
      </button>

      {/* Profile header */}
      <div className="fade-up" style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 20, padding: 28, marginBottom: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Avatar src={profile.avatar} name={profile.username} size={70} />
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
                {profile.username}
              </h2>
              {profile.bio && (
                <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 8 }}>{profile.bio}</p>
              )}
            </div>
          </div>

          {/* Follow button */}
          {!isOwnProfile && (
            <button onClick={toggleFollow} style={{
              padding: '9px 20px', borderRadius: 20, fontSize: 13,
              fontWeight: 600, cursor: 'pointer', flexShrink: 0,
              background: isFollowing ? 'var(--bg3)' : 'var(--indigo)',
              color: isFollowing ? 'var(--text2)' : '#fff',
              border: isFollowing ? '1px solid var(--border2)' : 'none',
              display: 'flex', alignItems: 'center', gap: 6
            }}>
              {isFollowing
                ? <><UserCheck size={14} /> Following</>
                : <><UserPlus size={14} /> Follow</>
              }
            </button>
          )}

          {isOwnProfile && (
            <button onClick={() => navigate('/profile')} style={{
              padding: '9px 20px', borderRadius: 20, fontSize: 13,
              fontWeight: 600, cursor: 'pointer',
              background: 'var(--bg3)', color: 'var(--text2)',
              border: '1px solid var(--border2)'
            }}>
              Edit Profile
            </button>
          )}
        </div>

        {!isOwnProfile && (
          <button onClick={() => setShowSubModal(true)} style={{
            padding: '9px 16px', borderRadius: 20, fontSize: 13,
            fontWeight: 600, cursor: 'pointer', flexShrink: 0,
            background: subscription ? '#f59e0b22' : 'var(--bg3)',
            color: subscription ? '#f59e0b' : 'var(--text2)',
            border: `1px solid ${subscription ? '#f59e0b' : 'var(--border2)'}`,
            display: 'flex', alignItems: 'center', gap: 6
          }}>
            {subscription ? `⭐ ${subscription.tier.toUpperCase()}` : '⭐ Subscribe'}
          </button>
        )}

        {/* Sub modal */}
        {showSubModal && (
          <div style={{
            position: 'fixed', inset: 0, background: '#00000088',
            zIndex: 1000, display: 'flex', alignItems: 'center',
            justifyContent: 'center', padding: 24
          }} onClick={() => setShowSubModal(false)}>
            <div onClick={e => e.stopPropagation()} style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 20, padding: 28, width: '100%', maxWidth: 400
            }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, marginBottom: 4 }}>
                Subscribe to {profile.username}
              </h3>
              <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 20 }}>
                Choose a tier to support {profile.username}
              </p>
              {[
                { tier: 'basic', price: 50, icon: '⭐', color: '#6366f1', perks: ['Subscriber badge', 'Support creator'] },
                { tier: 'pro', price: 150, icon: '🔥', color: '#f59e0b', perks: ['Pro badge', 'Exclusive posts', 'Priority in chat'] },
                { tier: 'vip', price: 300, icon: '👑', color: '#ef4444', perks: ['VIP badge', 'All Pro perks', 'Direct message access'] },
              ].map(t => (
                <div key={t.tier} onClick={() => subscribe(t.tier)} style={{
                  border: `1px solid ${t.color}44`, borderRadius: 14,
                  padding: '14px 16px', marginBottom: 10, cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                  onMouseEnter={e => e.currentTarget.style.background = t.color + '11'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 800, fontSize: 15, color: t.color }}>
                      {t.icon} {t.tier.toUpperCase()}
                    </span>
                    <span style={{ fontWeight: 800, color: t.color }}>{t.price} 🪙/month</span>
                  </div>
                  {t.perks.map(p => (
                    <p key={p} style={{ fontSize: 12, color: 'var(--text2)' }}>✓ {p}</p>
                  ))}
                </div>
              ))}
              <button onClick={() => setShowSubModal(false)} style={{
                width: '100%', padding: '10px', background: 'none',
                color: 'var(--text2)', border: '1px solid var(--border)',
                borderRadius: 10, cursor: 'pointer', fontSize: 13, marginTop: 8
              }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 24 }}>
          <button onClick={() => setShowFollowers(true)} style={{
            background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0
          }}>
            <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
              {profile.followers?.length || 0}
            </span>
            <span style={{ color: 'var(--text2)', fontSize: 13, marginLeft: 4 }}>followers</span>
          </button>

          <button onClick={() => setShowFollowing(true)} style={{
            background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0
          }}>
            <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
              {profile.following?.length || 0}
            </span>
            <span style={{ color: 'var(--text2)', fontSize: 13, marginLeft: 4 }}>following</span>
          </button>

          <div>
            <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
              {posts.length}
            </span>
            <span style={{ color: 'var(--text2)', fontSize: 13, marginLeft: 4 }}>posts</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="fade-up-2" style={{
        display: 'flex', gap: 4, marginBottom: 20,
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 4
      }}>
        {['posts', 'goals'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            flex: 1, padding: '8px', borderRadius: 8, border: 'none',
            background: activeTab === tab ? 'var(--indigo)' : 'none',
            color: activeTab === tab ? '#fff' : 'var(--text2)',
            cursor: 'pointer', fontSize: 13, fontWeight: 600,
            textTransform: 'capitalize', transition: 'all 0.15s'
          }}>{tab}</button>
        ))}
      </div>

      {/* Posts tab */}
      {activeTab === 'posts' && (
        <div>
          {posts.length === 0 && (
            <div style={{
              textAlign: 'center', padding: 60, color: 'var(--text2)',
              background: 'var(--bg2)', borderRadius: 16, border: '1px solid var(--border)'
            }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>📭</p>
              <p>No posts yet</p>
            </div>
          )}
          {posts.map((post, i) => (
            <div key={post._id} className="fade-up"
              onClick={() => navigate(`/post/${post._id}`)}
              style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 16, padding: 20, marginBottom: 14,
                cursor: 'pointer', animationDelay: `${i * 0.05}s`,
                transition: 'border-color 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--indigo)44'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <p style={{ fontSize: 15, lineHeight: 1.7, marginBottom: 12 }}>{post.content}</p>
              {post.image && (
                <img src={post.image} alt="post" style={{
                  width: '100%', borderRadius: 10, marginBottom: 12,
                  maxHeight: 300, objectFit: 'cover'
                }} />
              )}
              <div style={{ display: 'flex', gap: 16, color: 'var(--text2)', fontSize: 13 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Heart size={13} /> {post.likes?.length || 0}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MessageCircle size={13} /> {post.comments?.length || 0}
                </span>
                <span style={{ marginLeft: 'auto' }}>
                  {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Goals tab */}
      {activeTab === 'goals' && (
        <div>
          {goals.length === 0 && (
            <div style={{
              textAlign: 'center', padding: 60, color: 'var(--text2)',
              background: 'var(--bg2)', borderRadius: 16, border: '1px solid var(--border)'
            }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>🎯</p>
              <p>No public goals yet</p>
            </div>
          )}
          {goals.map((goal, i) => (
            <div key={goal._id} className="fade-up" style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 16, padding: 20, marginBottom: 14,
              animationDelay: `${i * 0.05}s`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <Target size={16} color="var(--indigo)" />
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700 }}>
                  {goal.title}
                </h3>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                  background: goal.status === 'completed' ? 'var(--green)22' : 'var(--indigo)22',
                  color: goal.status === 'completed' ? 'var(--green)' : 'var(--indigo-light)',
                  marginLeft: 'auto', textTransform: 'uppercase'
                }}>{goal.status}</span>
              </div>
              {goal.description && (
                <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 12 }}>{goal.description}</p>
              )}
              <div style={{ background: 'var(--bg3)', borderRadius: 4, height: 6 }}>
                <div style={{
                  height: '100%', borderRadius: 4,
                  width: `${goal.progress}%`,
                  background: goal.progress === 100 ? 'var(--green)' : 'linear-gradient(90deg, var(--indigo), #8b5cf6)',
                  transition: 'width 0.4s ease'
                }} />
              </div>
              <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6 }}>{goal.progress}% complete</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}