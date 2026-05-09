const db = require('../config/db');
const fs = require('fs');
const path = require('path');

// ================= GET ALL =================
exports.getAllModuls = (req, res) => {
  db.query('SELECT * FROM moduls ORDER BY created_at DESC', (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
};

// ================= GET BY ID =================
exports.getModulById = (req, res) => {
  const { id } = req.params;

  db.query('SELECT * FROM moduls WHERE id = ?', [id], (err, results) => {
    if (err) return res.status(500).json(err);

    if (results.length === 0) {
      return res.status(404).json({ message: 'Modul tidak ditemukan' });
    }

    res.json(results[0]);
  });
};

// ================= CREATE =================
exports.createModul = (req, res) => {
  const data = req.body;

  db.query('INSERT INTO moduls SET ?', data, (err, result) => {
    if (err) return res.status(500).json(err);

    res.status(201).json({
      message: 'Modul berhasil ditambahkan',
      id: result.insertId,
    });
  });
};

// ================= UPDATE =================
exports.updateModul = (req, res) => {
  const { id } = req.params;
  const data = req.body;

  db.query('SELECT * FROM moduls WHERE id = ?', [id], (err, results) => {
    if (err) return res.status(500).json(err);

    if (results.length === 0) {
      return res.status(404).json({ message: 'Modul tidak ditemukan' });
    }

    db.query('UPDATE moduls SET ? WHERE id = ?', [data, id], err => {
      if (err) return res.status(500).json(err);

      res.json({
        message: 'Modul berhasil diperbarui',
      });
    });
  });
};

// ================= DELETE =================
exports.deleteModul = (req, res) => {
  const { id } = req.params;

  db.query('SELECT * FROM moduls WHERE id = ?', [id], (err, results) => {
    if (err) return res.status(500).json(err);

    if (results.length === 0) {
      return res.status(404).json({ message: 'Modul tidak ditemukan' });
    }

    const modul = results[0];

    // hapus file PDF
    if (modul.file_path) {
      const pdfPath = path.join(__dirname, '..', modul.file_path);

      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }
    }

    // hapus thumbnail
    if (modul.thumbnail_path) {
      const thumbPath = path.join(__dirname, '..', modul.thumbnail_path);

      if (fs.existsSync(thumbPath)) {
        fs.unlinkSync(thumbPath);
      }
    }

    db.query('DELETE FROM moduls WHERE id = ?', [id], err => {
      if (err) return res.status(500).json(err);

      res.json({
        message: 'Modul berhasil dihapus',
      });
    });
  });
};

// ================= UPLOAD FILE =================
exports.uploadFile = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'File tidak ditemukan' });
    }

    const filePath = '/' + req.file.path.replace(/\\/g, '/');

    res.json({
      message: 'Upload berhasil',
      file_path: filePath,
      file_name: req.file.originalname,
      file_size: (req.file.size / 1024 / 1024).toFixed(2) + ' MB',
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: 'Upload gagal',
    });
  }
};
