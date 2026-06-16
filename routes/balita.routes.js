const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

// =============================
// MULTER
// =============================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads';

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }

    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, `balita_${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage });

// =============================
// GET BALITA BY USER ID
// GET /api/balita/:userId
// =============================
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const [rows] = await db.query(
      `
      SELECT *
      FROM balita
      WHERE user_id = ?
      ORDER BY created_at DESC
      `,
      [userId],
    );

    res.json(rows);
  } catch (err) {
    console.error('GET BALITA ERROR:', err);
    res.status(500).json({
      message: 'Server error',
    });
  }
});

// =============================
// CREATE BALITA
// POST /api/balita
// =============================
router.post('/', upload.single('foto_balita'), async (req, res) => {
  try {
    const { user_id, nama_lengkap, jenis_kelamin, tanggal_lahir } = req.body;

    if (!user_id || !nama_lengkap || !jenis_kelamin || !tanggal_lahir) {
      return res.status(400).json({
        message: 'Data balita belum lengkap',
      });
    }

    let foto_balita = null;

    if (req.file) {
      foto_balita = req.file.path.replace(/\\/g, '/');
    }

    const [result] = await db.query(
      `
      INSERT INTO balita
      (
        user_id,
        nama_lengkap,
        jenis_kelamin,
        tanggal_lahir,
        foto_balita
      )
      VALUES (?, ?, ?, ?, ?)
      `,
      [user_id, nama_lengkap, jenis_kelamin, tanggal_lahir, foto_balita],
    );

    res.json({
      message: 'Balita berhasil ditambahkan',
      id: result.insertId,
    });
  } catch (err) {
    console.error('CREATE BALITA ERROR:', err);

    res.status(500).json({
      message: 'Server error',
    });
  }
});

// =============================
// UPDATE BALITA
// POST /api/balita/:id
// =============================
router.post('/:id', upload.single('foto_balita'), async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query('SELECT * FROM balita WHERE id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        message: 'Balita tidak ditemukan',
      });
    }

    const oldData = rows[0];
    const oldImage = oldData.foto_balita;

    let foto_balita = oldImage;

    if (req.file) {
      foto_balita = req.file.path.replace(/\\/g, '/');

      if (oldImage && fs.existsSync(oldImage)) {
        fs.unlinkSync(oldImage);
      }
    }

    const { nama_lengkap, jenis_kelamin, tanggal_lahir } = req.body;

    await db.query(
      `
      UPDATE balita
      SET
        nama_lengkap = ?,
        jenis_kelamin = ?,
        tanggal_lahir = ?,
        foto_balita = ?
      WHERE id = ?
      `,
      [
        nama_lengkap || oldData.nama_lengkap,
        jenis_kelamin || oldData.jenis_kelamin,
        tanggal_lahir || oldData.tanggal_lahir,
        foto_balita,
        id,
      ],
    );

    res.json({
      message: 'Data balita berhasil diupdate',
    });
  } catch (err) {
    console.error('UPDATE BALITA ERROR:', err);

    res.status(500).json({
      message: 'Server error',
    });
  }
});

// =============================
// DELETE BALITA
// DELETE /api/balita/:id
// =============================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      'SELECT foto_balita FROM balita WHERE id = ?',
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: 'Balita tidak ditemukan',
      });
    }

    const image = rows[0].foto_balita;

    if (image && fs.existsSync(image)) {
      fs.unlinkSync(image);
    }

    await db.query('DELETE FROM balita WHERE id = ?', [id]);

    res.json({
      message: 'Data balita berhasil dihapus',
    });
  } catch (err) {
    console.error('DELETE BALITA ERROR:', err);

    res.status(500).json({
      message: 'Server error',
    });
  }
});

// =============================
// GET PERTUMBUHAN BALITA
// GET /api/balita/:id/pertumbuhan
// =============================
router.get('/:id/pertumbuhan', async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      `
      SELECT *
      FROM balita_pertumbuhan
      WHERE balita_id = ?
      ORDER BY tanggal_pengukuran DESC, id DESC
      `,
      [id],
    );

    res.json(rows);
  } catch (err) {
    console.error('GET PERTUMBUHAN ERROR:', err);

    res.status(500).json({
      message: 'Server error',
    });
  }
});

// =============================
// HELPER
// =============================
function getAgeInMonths(birthDate, measureDate) {
  let months =
    (measureDate.getFullYear() - birthDate.getFullYear()) * 12 +
    (measureDate.getMonth() - birthDate.getMonth());

  if (measureDate.getDate() < birthDate.getDate()) {
    months--;
  }

  return Math.max(months, 0);
}

// =============================
// STUNTING (TB/U)
// Pendekatan awal berdasarkan WHO
// =============================

function getStatusStunting(umurBulan, tinggi, jenisKelamin) {
  const tbMin = {
    'Laki-laki': {
      0: 46,
      1: 50,
      2: 54,
      3: 57,
      4: 60,
      5: 62,
      6: 64,
      12: 72,
      24: 83,
      36: 91,
      48: 98,
      60: 105,
    },
    Perempuan: {
      0: 45,
      1: 49,
      2: 53,
      3: 56,
      4: 59,
      5: 61,
      6: 63,
      12: 71,
      24: 82,
      36: 90,
      48: 97,
      60: 104,
    },
  };

  const data = tbMin[jenisKelamin] || tbMin['Perempuan'];

  const keys = Object.keys(data)
    .map(Number)
    .sort((a, b) => a - b);

  let batas = data[0];

  for (const key of keys) {
    if (umurBulan >= key) {
      batas = data[key];
    }
  }

  if (tinggi < batas - 3) {
    return 'Sangat Pendek';
  }

  if (tinggi < batas) {
    return 'Pendek';
  }

  return 'Normal';
}

// =============================
// BB/U
// Pendekatan awal berdasarkan WHO
// =============================
function getStatusBerat(umurBulan, berat, jenisKelamin) {
  // 0-6 bulan
  if (umurBulan <= 6) {
    if (jenisKelamin === 'Laki-laki') {
      if (berat < 3.5) return 'Gizi Buruk';
      if (berat < 4.5) return 'Gizi Kurang';
      if (berat > 10) return 'Gizi Lebih';
    } else {
      if (berat < 3.3) return 'Gizi Buruk';
      if (berat < 4.2) return 'Gizi Kurang';
      if (berat > 9.5) return 'Gizi Lebih';
    }
  }
  // 7-12 bulan
  else if (umurBulan <= 12) {
    if (jenisKelamin === 'Laki-laki') {
      if (berat < 6.5) return 'Gizi Buruk';
      if (berat < 7.5) return 'Gizi Kurang';
      if (berat > 12) return 'Gizi Lebih';
    } else {
      if (berat < 6.0) return 'Gizi Buruk';
      if (berat < 7.0) return 'Gizi Kurang';
      if (berat > 11.5) return 'Gizi Lebih';
    }
  }
  // 13-24 bulan
  else if (umurBulan <= 24) {
    if (jenisKelamin === 'Laki-laki') {
      if (berat < 8) return 'Gizi Buruk';
      if (berat < 9) return 'Gizi Kurang';
      if (berat > 15) return 'Gizi Lebih';
    } else {
      if (berat < 7.5) return 'Gizi Buruk';
      if (berat < 8.5) return 'Gizi Kurang';
      if (berat > 14.5) return 'Gizi Lebih';
    }
  }
  // 25-36 bulan
  else if (umurBulan <= 36) {
    if (jenisKelamin === 'Laki-laki') {
      if (berat < 10) return 'Gizi Buruk';
      if (berat < 11) return 'Gizi Kurang';
      if (berat > 18) return 'Gizi Lebih';
    } else {
      if (berat < 9.5) return 'Gizi Buruk';
      if (berat < 10.5) return 'Gizi Kurang';
      if (berat > 17.5) return 'Gizi Lebih';
    }
  }
  // > 36 bulan
  else {
    if (jenisKelamin === 'Laki-laki') {
      if (berat < 12) return 'Gizi Buruk';
      if (berat < 13) return 'Gizi Kurang';
      if (berat > 22) return 'Gizi Lebih';
    } else {
      if (berat < 11.5) return 'Gizi Buruk';
      if (berat < 12.5) return 'Gizi Kurang';
      if (berat > 21) return 'Gizi Lebih';
    }
  }

  return 'Gizi Baik';
}

// =============================
// CREATE PERTUMBUHAN
// POST /api/balita/:id/pertumbuhan
// =============================
router.post('/:id/pertumbuhan', upload.none(), async (req, res) => {
  try {
    const { id } = req.params;

    const { berat_badan, tinggi_badan, tanggal_pengukuran, catatan } = req.body;

    const [rows] = await db.query(
      `
      SELECT
        id,
        nama_lengkap,
        jenis_kelamin,
        tanggal_lahir
      FROM balita
      WHERE id = ?
      `,
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: 'Balita tidak ditemukan',
      });
    }

    if (!berat_badan || !tinggi_badan || !tanggal_pengukuran) {
      return res.status(400).json({
        message: 'Berat badan, tinggi badan dan tanggal pengukuran wajib diisi',
      });
    }

    const bb = parseFloat(berat_badan);
    const tb = parseFloat(tinggi_badan);

    if (isNaN(bb) || isNaN(tb)) {
      return res.status(400).json({
        message: 'Berat badan dan tinggi badan harus berupa angka',
      });
    }

    const balita = rows[0];

    const birthDate = new Date(balita.tanggal_lahir);
    const measureDate = new Date(tanggal_pengukuran);

    if (measureDate < birthDate) {
      return res.status(400).json({
        message: 'Tanggal pengukuran tidak boleh sebelum tanggal lahir',
      });
    }

    const umur_bulan = getAgeInMonths(birthDate, measureDate);

    const statusBB = getStatusBerat(umur_bulan, bb, balita.jenis_kelamin);
    const statusTB = getStatusStunting(umur_bulan, tb, balita.jenis_kelamin);

    let status_gizi = statusBB;

    if (statusTB === 'Pendek' || statusTB === 'Sangat Pendek') {
      status_gizi = `${statusBB} - ${statusTB}`;
    }

    const [result] = await db.query(
      `
      INSERT INTO balita_pertumbuhan
      (
        balita_id,
        berat_badan,
        tinggi_badan,
        tanggal_pengukuran,
        status_gizi,
        catatan
      )
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [id, bb, tb, tanggal_pengukuran, status_gizi, catatan || null],
    );

    res.status(201).json({
      message: 'Data pertumbuhan berhasil disimpan',
      id: result.insertId,
      umur_bulan,
      status_gizi,
      status_berat: statusBB,
      status_tinggi: statusTB,
    });
  } catch (err) {
    console.error('CREATE PERTUMBUHAN ERROR:', err);

    res.status(500).json({
      message: 'Server error',
      error: err.message,
    });
  }
});

// =============================
// UPDATE PERTUMBUHAN
// PUT /api/balita/pertumbuhan/:id
// =============================
router.put('/pertumbuhan/:id', upload.none(), async (req, res) => {
  try {
    const { id } = req.params;

    const { berat_badan, tinggi_badan, tanggal_pengukuran, catatan } = req.body;

    if (!berat_badan || !tinggi_badan || !tanggal_pengukuran) {
      return res.status(400).json({
        message: 'Berat badan, tinggi badan dan tanggal pengukuran wajib diisi',
      });
    }

    const bb = parseFloat(berat_badan);
    const tb = parseFloat(tinggi_badan);

    if (isNaN(bb) || isNaN(tb)) {
      return res.status(400).json({
        message: 'Berat badan dan tinggi badan harus berupa angka',
      });
    }

    const [rows] = await db.query(
      `
      SELECT 
        bp.*,
        b.nama_lengkap,
        b.jenis_kelamin,
        b.tanggal_lahir
      FROM balita_pertumbuhan bp
      JOIN balita b ON bp.balita_id = b.id
      WHERE bp.id = ?
      `,
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: 'Data pertumbuhan tidak ditemukan',
      });
    }

    const data = rows[0];

    const birthDate = new Date(data.tanggal_lahir);
    const measureDate = new Date(tanggal_pengukuran);

    if (measureDate < birthDate) {
      return res.status(400).json({
        message: 'Tanggal pengukuran tidak boleh sebelum tanggal lahir',
      });
    }

    const umur_bulan = getAgeInMonths(birthDate, measureDate);

    const statusBB = getStatusBerat(umur_bulan, bb);
    const statusTB = getStatusStunting(umur_bulan, tb, data.jenis_kelamin);

    let status_gizi = statusBB;

    if (statusTB === 'Pendek' || statusTB === 'Sangat Pendek') {
      status_gizi = `${statusBB} - ${statusTB}`;
    }

    await db.query(
      `
      UPDATE balita_pertumbuhan
      SET
        berat_badan = ?,
        tinggi_badan = ?,
        tanggal_pengukuran = ?,
        status_gizi = ?,
        catatan = ?
      WHERE id = ?
      `,
      [bb, tb, tanggal_pengukuran, status_gizi, catatan || null, id],
    );

    res.json({
      message: 'Data pertumbuhan berhasil diupdate',
      umur_bulan,
      status_gizi,
      status_berat: statusBB,
      status_tinggi: statusTB,
    });
  } catch (err) {
    console.error('UPDATE PERTUMBUHAN ERROR:', err);

    res.status(500).json({
      message: 'Server error',
      error: err.message,
    });
  }
});

// =============================
// DELETE PERTUMBUHAN
// DELETE /api/balita/pertumbuhan/:id
// =============================
router.delete('/:balitaId/pertumbuhan/:id', async (req, res) => {
  try {
    const { balitaId, id } = req.params;

    const [rows] = await db.query(
      `
      SELECT id
      FROM balita_pertumbuhan
      WHERE id = ?
      AND balita_id = ?
      `,
      [id, balitaId],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: 'Data pertumbuhan tidak ditemukan',
      });
    }

    await db.query(
      `
      DELETE FROM balita_pertumbuhan
      WHERE id = ?
      AND balita_id = ?
      `,
      [id, balitaId],
    );

    res.json({
      message: 'Data pertumbuhan berhasil dihapus',
    });
  } catch (err) {
    console.error('DELETE PERTUMBUHAN ERROR:', err);

    res.status(500).json({
      message: 'Server error',
    });
  }
});

module.exports = router;
