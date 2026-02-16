const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Setup multer untuk upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, full_name, email FROM users');
    res.json(rows);
  } catch (err) {
    console.error('GET USERS ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Data Ibu Hamil
router.get('/ibu', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT *
      FROM users
      WHERE role = 'user'
      ORDER BY created_at DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// =============================
// CREATE IBU HAMIL
// =============================
router.post('/ibu', upload.single('photo'), async (req, res) => {
  try {
    const {
      full_name,
      email,
      phone,
      address,
      birth_date,
      blood_type,
      pregnancy_week,
      height,
      pre_pregnancy_weight,
    } = req.body;

    let profile_image = null;
    if (req.file) {
      profile_image = req.file.path.replace(/\\/g, '/');
    }

    const [result] = await db.query(
      `INSERT INTO users 
  (full_name, email, phone, address, birth_date, blood_type, pregnancy_week, height, pre_pregnancy_weight, password, role, profile_image)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'user', ?)`,
      [
        full_name,
        email,
        phone,
        address,
        birth_date,
        blood_type,
        pregnancy_week,
        height || null,
        pre_pregnancy_weight || null,
        '$2a$12$bGG.j0XrHnozDODNVBAUAOIv8yFYuIfWBGe9gbekrdvCvOS1XQXea',
        profile_image,
      ],
    );

    res.json({ message: 'Ibu berhasil ditambahkan', id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// =============================
// UPDATE IBU + FOTO
// =============================
router.put('/ibu/:id', upload.single('photo'), async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query(
      "SELECT * FROM users WHERE id = ? AND role = 'user'",
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    const oldImage = rows[0].profile_image;

    const {
      full_name,
      email,
      phone,
      address,
      birth_date,
      blood_type,
      pregnancy_week,
      height,
      pre_pregnancy_weight,
      delete_photo,
    } = req.body;

    let profile_image = oldImage;

    if (req.file) {
      profile_image = req.file.path.replace(/\\/g, '/');

      // hapus foto lama
      if (oldImage && fs.existsSync(oldImage)) {
        fs.unlinkSync(oldImage);
      }
    }

    if (delete_photo === '1') {
      if (oldImage && fs.existsSync(oldImage)) {
        fs.unlinkSync(oldImage);
      }
      profile_image = null;
    }

    await db.query(
      `UPDATE users SET
        full_name = ?,
        email = ?,
        phone = ?,
        address = ?,
        birth_date = ?,
        blood_type = ?,
        pregnancy_week = ?,
        height = ?,
        pre_pregnancy_weight = ?,
        profile_image = ?
      WHERE id = ?`,
      [
        full_name,
        email,
        phone,
        address,
        birth_date,
        blood_type,
        pregnancy_week,
        height || null,
        pre_pregnancy_weight || null,
        profile_image,
        id,
      ],
    );

    res.json({ message: 'Data ibu berhasil diupdate' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// =============================
// DELETE IBU
// =============================
router.delete('/ibu/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await db.query("DELETE FROM users WHERE id = ? AND role = 'user'", [id]);
    res.json({ message: 'Data ibu berhasil dihapus' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});
// ============================
// GET USER BY ID
// ============================
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query(
      'SELECT id, full_name, email, phone, address, birth_date, blood_type, height, pregnancy_week, pre_pregnancy_weight, profile_image FROM users WHERE id = ?',
      [id],
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================
// UPDATE USER PROFILE
// ============================
router.post('/:id', upload.single('photo'), async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const oldImage = rows[0].profile_image;

    let profile_image = oldImage;
    if (req.file) {
      profile_image = req.file.path.replace(/\\/g, '/');
    }

    const fields = [];
    const values = [];

    Object.entries(req.body).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    fields.push('profile_image = ?');
    values.push(profile_image);
    values.push(id);

    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    await db.query(sql, values);

    // hapus foto lama jika ganti
    if (req.file && oldImage && fs.existsSync(oldImage)) {
      fs.unlinkSync(oldImage);
    }

    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================
// DELETE PROFILE IMAGE
// ============================
router.delete('/:id/profile-image', async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query(
      'SELECT profile_image FROM users WHERE id = ?',
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const imagePath = rows[0].profile_image;

    // hapus file fisik
    if (imagePath && fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    // set kolom jadi NULL
    await db.query('UPDATE users SET profile_image = NULL WHERE id = ?', [id]);

    res.json({ message: 'Profile image deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
