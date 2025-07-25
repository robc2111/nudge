const pool = require('../db');

// GET all users
const getUsers = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST create a new user
const createUser = async (req, res) => {
  if (!req.body || !req.body.telegram_id) {
    return res.status(400).json({ error: 'Missing telegram_id in request body' });
  }

  const { telegram_id, name, tone_id } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO users (telegram_id, name, tone_id) VALUES ($1, $2, $3) RETURNING *',
      [telegram_id, name, tone_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET user by ID
// GET user by ID
const getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT update user
const updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, tone_id } = req.body;
  try {
    const result = await pool.query(
      'UPDATE users SET name = $1, tone_id = $2 WHERE id = $3 RETURNING *',
      [name, tone_id, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE user
const deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ message: "User deleted", user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getUsers,
  createUser,
  getUserById,
  updateUser,
  deleteUser
};