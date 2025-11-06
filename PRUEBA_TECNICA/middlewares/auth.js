const auth = require('basic-auth');

const users = {
  admin: 'admin123',
  user: 'user123'
};

function basicAuth(req, res, next) {
  const credentials = auth(req);

  if (!credentials || !users[credentials.name] || users[credentials.name] !== credentials.pass) {
    return res.status(401).json({ message: 'Autenticación fallida' });
  }

  next();
}

module.exports = basicAuth;
