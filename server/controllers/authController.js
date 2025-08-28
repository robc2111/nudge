// server/controllers/authController.js (example)
const jwt = require('jsonwebtoken');

function sign(user) {
  return jwt.sign(
    { id: user.id, email: user.email },   // 👈 exactly these keys
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
}