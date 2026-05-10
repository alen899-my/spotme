try {
  const auth = require('../routes/auth');
  console.log('Auth routes loaded successfully');
  console.log('Available paths:', auth.stack.filter(r => r.route).map(r => r.route.path));
} catch (e) {
  console.error('Failed to load auth routes:', e.message);
}
