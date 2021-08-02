const jwt = require('jsonwebtoken');

const HttpError = require('../models/http-error');

module.exports = (req, res, next) => {
  if (req.method === 'OPTIONS') {
    return next();
  }

  try {
    const token = req.headers.authorization.split(' ')[1];
    if (!token) {
      throw new Error('Authetication failed!');
    }

    const decodedToken = jwt.verify(token, process.env.JWT_PRIVATE_KEY);
    req.userId = decodedToken.userId;
    next();
  } catch (err) {
    return next(new HttpError('Authetication failed!', 403));
  }
};
