const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

/* ======================================================
   HELPER
====================================================== */

function calculatePregnancy(startDate) {
  if (!startDate) return null;

  const start = new Date(startDate);
  const now = new Date();
  const diffMs = now - start;
  if (diffMs < 0) return null;

  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return {
    weeks: Math.floor(totalDays / 7),
    days: totalDays % 7,
    totalDays,
  };
}

/* ======================================================
   MULTER UPLOAD
====================================================== */

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = 'uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

/* ======================================================
   GET ALL USERS (simple list)
====================================================== */

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, full_name, email, role FROM users',
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ======================================================
   ADMIN ROUTES
====================================================== */

/* GET ADMIN LIST */
router.get('/admin', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, full_name AS name, email, role
      FROM users
      WHERE role IN ('admin','super_admin')
      ORDER BY id DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* CREATE ADMIN */
router.post('/admin', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: 'Field wajib diisi' });

    const hashed = await bcrypt.hash(password, 10);

    await db.query(
      `INSERT INTO users (full_name,email,password,role)
       VALUES (?,?,?,?)`,
      [name, email, hashed, role || 'admin'],
    );

    res.json({ message: 'Admin berhasil dibuat' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* UPDATE ADMIN */
router.put('/admin/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, role } = req.body;

  try {
    const [result] = await db.query(
      `UPDATE users 
       SET full_name=?, email=?, role=? 
       WHERE id=?`,
      [name, email, role, id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Admin tidak ditemukan' });
    }

    res.json({ message: 'Admin berhasil diupdate' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Email sudah digunakan' });
    }

    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* DELETE ADMIN */
router.delete('/admin/:id', async (req, res) => {
  try {
    await db.query(
      "DELETE FROM users WHERE id=? AND role IN ('admin','super_admin')",
      [req.params.id],
    );

    res.json({ message: 'Admin berhasil dihapus' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ======================================================
   GET USER BY ID
====================================================== */

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE id=?', [
      req.params.id,
    ]);

    if (!rows.length)
      return res.status(404).json({ message: 'User not found' });

    const user = rows[0];

    res.json({
      ...user,
      pregnancy_info: calculatePregnancy(user.pregnancy_start_date),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
