const errorLog = require('../services/errorLogService');

module.exports = (err, req, res, _next) => {
  console.error(err);
  errorLog.logError(err, req);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
};
