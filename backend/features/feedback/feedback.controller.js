const feedbackService = require('./feedback.service');

/**
 * Handles feedback submission request.
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

module.exports = {
  submitFeedback,
};
