const errorHandler = (err, req, res, next) => {
  console.error('Request error:', err.message);

  if (err.name === 'MulterError') {
    return res.status(400).json({ error: err.message });
  }

  if (err.message && err.message.includes('Only image files')) {
    return res.status(400).json({ error: err.message });
  }

  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production' && status >= 500
    ? 'Internal server error'
    : (err.message || 'Internal server error');

  res.status(status).json({ error: message });
};

module.exports = errorHandler;
