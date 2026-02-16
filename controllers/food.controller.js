const db = require('../config/db');
const fs = require('fs');
const path = require('path');

// ================= GET =================
exports.getAllFoods = (req, res) => {
  db.query('SELECT * FROM foods ORDER BY id DESC', (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
};

// ================= POST =================
exports.createFood = (req, res) => {
  const data = req.body;

  // handle image
  if (req.file) {
    data.image = req.file.path.replace(/\\/g, '/');
  }

  db.query('INSERT INTO foods SET ?', data, (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: 'Makanan berhasil ditambahkan' });
  });
};

// ================= PUT =================
exports.updateFood = (req, res) => {
  const { id } = req.params;
  const data = req.body;

  // ambil data lama dulu
  db.query(
    'SELECT image FROM foods WHERE id = ?',
    [id],
    (err, results) => {
      if (err) return res.status(500).json(err);
      if (results.length === 0) {
        return res.status(404).json({ message: 'Makanan tidak ditemukan' });
      }

      const oldImage = results[0].image;

      // kalau upload gambar baru
      if (req.file) {
        data.image = req.file.path.replace(/\\/g, '/');
      }

      db.query(
        'UPDATE foods SET ? WHERE id = ?',
        [data, id],
        (err) => {
          if (err) return res.status(500).json(err);

          // hapus gambar lama kalau diganti
          if (req.file && oldImage && fs.existsSync(oldImage)) {
            fs.unlinkSync(oldImage);
          }

          res.json({ message: 'Makanan berhasil diupdate' });
        }
      );
    }
  );
};

// ================= DELETE =================
exports.deleteFood = (req, res) => {
  const { id } = req.params;

  // ambil image dulu
  db.query(
    'SELECT image FROM foods WHERE id = ?',
    [id],
    (err, results) => {
      if (err) return res.status(500).json(err);
      if (results.length === 0) {
        return res.status(404).json({ message: 'Makanan tidak ditemukan' });
      }

      const imagePath = results[0].image;

      db.query(
        'DELETE FROM foods WHERE id = ?',
        [id],
        (err) => {
          if (err) return res.status(500).json(err);

          // hapus file gambar
          if (imagePath && fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }

          res.json({ message: 'Makanan berhasil dihapus' });
        }
      );
    }
  );
};
