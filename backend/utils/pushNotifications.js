const axios = require('axios');
const { pool } = require('../db');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const MOTIVATIONS = [
  { title: '💪 Keep Going', body: 'The only bad workout is the one that didn\'t happen. You\'ve got this!' },
  { title: '🔥 Stay Strong', body: 'Your body can stand almost anything. It\'s your mind you have to convince.' },
  { title: '🏆 You\'re a Champion', body: 'It never gets easier. You just get stronger. Keep showing up!' },
  { title: '⚡ Power Up', body: 'Every rep counts. Every drop of sweat is progress. Don\'t stop now!' },
  { title: '🎯 Stay Focused', body: 'Don\'t limit your challenges. Challenge your limits. You are capable of more than you know.' },
  { title: '💥 Crush It', body: 'Push yourself because no one else is going to do it for you. Today is your day!' },
  { title: '📈 Progress Over Perfection', body: 'Small progress is still progress. Celebrate every step forward.' },
  { title: '🎯 Stay Disciplined', body: 'Motivation is what gets you started. Habit is what keeps you going.' },
  { title: '💫 Believe in Yourself', body: 'The person who moves a mountain begins by carrying away small stones. Keep going!' },
  { title: '⚡ Energy Boost', body: 'Every morning you have 2 choices: continue to sleep or wake up and chase your dreams. Choose wisely.' },
  { title: '💪 Beast Mode', body: 'Some people want it to happen. Some wish it would happen. Others MAKE it happen. Be the maker.' },
  { title: '🔥 Unstoppable', body: 'Success is not owned. It\'s rented — and the rent is due every single day.' },
  { title: '💪 Stronger Every Day', body: 'The struggle you\'re in today is developing the strength you need for tomorrow.' },
  { title: '⚡ Never Give Up', body: 'It\'s not about being the best. It\'s about being better than you were yesterday.' },
  { title: '🏅 Go Get It', body: 'Your health is an investment, not an expense. Keep investing in yourself.' },
  { title: '💥 Break Through', body: 'The only way to discover the limits of the possible is to go beyond them into the impossible.' },
  { title: '🌟 You\'ve Got This', body: 'Believe you can and you\'re halfway there. The rest is just showing up.' },
  { title: '🎯 One More Rep', body: 'When your body says stop, your mind says one more. That\'s where growth happens.' },
];

function isValidExpoPushToken(token) {
  return typeof token === 'string' && token.startsWith('ExponentPushToken[');
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function getToken(userId) {
  const res = await pool.query('SELECT token FROM push_tokens WHERE user_id = $1', [userId]);
  return res.rows[0]?.token || null;
}

async function registerToken(userId, token) {
  if (!isValidExpoPushToken(token)) {
    console.warn(`Invalid Expo push token for user ${userId}`);
    return false;
  }
  await pool.query(
    `INSERT INTO push_tokens (user_id, token, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (user_id) DO UPDATE SET token = $2, updated_at = NOW()`,
    [userId, token]
  );
  return true;
}

async function removeToken(userId) {
  await pool.query('DELETE FROM push_tokens WHERE user_id = $1', [userId]);
}

async function sendPush(userId, title, body, data = {}) {
  try {
    const token = await getToken(userId);
    if (!token) return;

    if (!isValidExpoPushToken(token)) {
      await removeToken(userId);
      return;
    }

    const response = await axios.post(EXPO_PUSH_URL, {
      to: token,
      sound: 'default',
      title,
      body,
      data,
      priority: 'high',
    }, {
      headers: { 'Content-Type': 'application/json' },
    });

    const receipt = response.data?.data;
    if (receipt?.status === 'error') {
      console.error(`Push error for user ${userId}:`, receipt.message);
      if (receipt.details?.error === 'DeviceNotRegistered') {
        await removeToken(userId);
      }
    }
  } catch (err) {
    console.error(`sendPush error for user ${userId}:`, err.message);
  }
}

async function sendRandomMotivation(userId) {
  try {
    // Cooldown: only send if last one was > 3 hours ago
    const user = await pool.query(
      'SELECT motivation_enabled, last_motivation_sent_at FROM users WHERE id = $1',
      [userId]
    );
    if (!user.rows.length) return;
    if (!user.rows[0].motivation_enabled) return;

    const lastSent = user.rows[0].last_motivation_sent_at
      ? new Date(user.rows[0].last_motivation_sent_at).getTime()
      : 0;

    if (Date.now() - lastSent < 3 * 3600000) return;

    // 50% chance to actually send (keeps it feeling random)
    if (Math.random() > 0.5) return;

    const msg = randomItem(MOTIVATIONS);
    await sendPush(userId, msg.title, msg.body, { type: 'motivation' });

    await pool.query(
      'UPDATE users SET last_motivation_sent_at = NOW() WHERE id = $1',
      [userId]
    );
  } catch (err) {
    console.error('sendRandomMotivation error:', err.message);
  }
}

module.exports = { registerToken, removeToken, sendPush, sendRandomMotivation };
