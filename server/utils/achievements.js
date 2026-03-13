const Achievement = require('../models/Achievement')
const Goal = require('../models/Goal')
const Session = require('../models/Session')
const User = require('../models/User')

const ACHIEVEMENTS = [
  { type: 'first_goal', title: 'Goal Setter', description: 'Created your first goal', icon: '🎯' },
  { type: 'first_session', title: 'Focus Starter', description: 'Completed your first session', icon: '⚡' },
  { type: 'first_post', title: 'Social Butterfly', description: 'Made your first post', icon: '🦋' },
  { type: 'goals_5', title: 'Overachiever', description: 'Completed 5 goals', icon: '🏆' },
  { type: 'goals_10', title: 'Goal Master', description: 'Completed 10 goals', icon: '👑' },
  { type: 'sessions_10', title: 'Flow State', description: 'Completed 10 focus sessions', icon: '🌊' },
  { type: 'sessions_50', title: 'Deep Worker', description: 'Completed 50 focus sessions', icon: '🧠' },
  { type: 'focus_60', title: 'One Hour Club', description: 'Focused for 60+ minutes total', icon: '⏰' },
  { type: 'focus_600', title: 'Ten Hour Club', description: 'Focused for 600+ minutes total', icon: '🔥' },
  { type: 'streak_3', title: 'On a Roll', description: '3 day streak', icon: '📈' },
  { type: 'streak_7', title: 'Week Warrior', description: '7 day streak', icon: '⚔️' },
  { type: 'streak_30', title: 'Monthly Legend', description: '30 day streak', icon: '🌟' },
  { type: 'followers_10', title: 'Influencer', description: 'Got 10 followers', icon: '👥' },
]

async function checkAchievements(userId) {
  try {
    const [user, goalsCompleted, sessionsCount, existing] = await Promise.all([
      User.findById(userId),
      Goal.countDocuments({ owner: userId, status: 'completed' }),
      Session.countDocuments({ 'participants.user': userId, isLive: false }),
      Achievement.find({ user: userId }).select('type')
    ])

    const existingTypes = new Set(existing.map(a => a.type))
    const toUnlock = []

    const check = (type) => !existingTypes.has(type)

    // goals
    if (check('first_goal') && goalsCompleted >= 1) toUnlock.push('first_goal')
    if (check('goals_5') && goalsCompleted >= 5) toUnlock.push('goals_5')
    if (check('goals_10') && goalsCompleted >= 10) toUnlock.push('goals_10')

    // sessions
    if (check('first_session') && sessionsCount >= 1) toUnlock.push('first_session')
    if (check('sessions_10') && sessionsCount >= 10) toUnlock.push('sessions_10')
    if (check('sessions_50') && sessionsCount >= 50) toUnlock.push('sessions_50')

    // focus time
    if (check('focus_60') && user.totalFocusMinutes >= 60) toUnlock.push('focus_60')
    if (check('focus_600') && user.totalFocusMinutes >= 600) toUnlock.push('focus_600')

    // streak
    if (check('streak_3') && user.streak?.current >= 3) toUnlock.push('streak_3')
    if (check('streak_7') && user.streak?.current >= 7) toUnlock.push('streak_7')
    if (check('streak_30') && user.streak?.current >= 30) toUnlock.push('streak_30')

    // followers
    if (check('followers_10') && user.followers?.length >= 10) toUnlock.push('followers_10')

    // unlock new achievements
    for (const type of toUnlock) {
      const def = ACHIEVEMENTS.find(a => a.type === type)
      if (def) await Achievement.create({ user: userId, ...def })
    }

    return toUnlock
  } catch (err) {
    console.log('achievement check error:', err.message)
  }
}

module.exports = { checkAchievements, ACHIEVEMENTS }