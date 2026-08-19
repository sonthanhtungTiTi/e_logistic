const jwt = require('jsonwebtoken');

const generateAccessToken = (id) => {
  return jwt.sign({ id, type: 'access' }, process.env.JWT_SECRET || 'secret', {
    expiresIn: '7d',
  });
};

const generateRefreshToken = (id) => {
  return jwt.sign({ id, type: 'refresh' }, process.env.JWT_SECRET || 'secret', {
    expiresIn: '30d',
  });
};

module.exports = { generateAccessToken, generateRefreshToken };
