const jwt = require('jsonwebtoken');

module.exports = (user) => ({
  token: 'Bearer ' + jwt.sign({ id: user.id },
   "secret"),user
  });