const feedbackService = require('./feedback.service');

/**
 * Handles feedback submission request for authenticated users.
 */
async function submitFeedback(req, res) {
  try {
    const userId = req.user.id;
    const { category, title, description } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ message: 'Description is required' });
    }

    const feedback = await feedbackService.createFeedback({
      userId,
      category,
      title,
      description,
    });

    return res.status(201).json({ success: true, feedback });
  } catch (err) {
    console.error('Feedback submission error:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Handles public contact form submissions from the landing page.
 */
async function handleContactSubmission(req, res) {
  try {
    const { name, email, msg } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Please enter your name.' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Please enter your email address.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    if (!msg || !msg.trim()) {
      return res.status(400).json({ message: 'Please enter a message.' });
    }

    const feedback = await feedbackService.submitContactFeedback({
      name: name.trim(),
      email: email.trim(),
      msg: msg.trim(),
    });

    return res.status(201).json({
      success: true,
      message: 'Thank you! Your message has been sent to the team.',
      feedbackId: feedback.id,
    });
  } catch (err) {
    console.error('Contact submission error:', err);
    return res.status(500).json({ error: 'Failed to send message. Please try again later.' });
  }
}

module.exports = {
  submitFeedback,
  handleContactSubmission,
};
