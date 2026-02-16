const db = require('../config/db');

// ================= GET =================
exports.getAllSchedules = (req, res) => {
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ message: 'user_id wajib dikirim' });
  }

  db.query(
    'SELECT * FROM schedules WHERE user_id = ? ORDER BY schedule_date ASC, schedule_time ASC',
    [user_id],
    (err, results) => {
      if (err) return res.status(500).json(err);
      res.json(results);
    }
  );
};

// ================= POST =================
exports.createSchedule = (req, res) => {
  const data = req.body;

  db.query('INSERT INTO schedules SET ?', data, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({
      message: 'Jadwal berhasil ditambahkan',
      id: result.insertId,
    });
  });
};

// ================= PUT =================
exports.updateSchedule = (req, res) => {
  const { id } = req.params;
  const data = req.body;

  db.query(
    'SELECT * FROM schedules WHERE id = ?',
    [id],
    (err, results) => {
      if (err) return res.status(500).json(err);
      if (results.length === 0) {
        return res.status(404).json({ message: 'Jadwal tidak ditemukan' });
      }

      db.query(
        'UPDATE schedules SET ? WHERE id = ?',
        [data, id],
        (err) => {
          if (err) return res.status(500).json(err);
          res.json({ message: 'Jadwal berhasil diupdate' });
        }
      );
    }
  );
};

// ================= DELETE =================
exports.deleteSchedule = (req, res) => {
  const { id } = req.params;

  db.query(
    'SELECT * FROM schedules WHERE id = ?',
    [id],
    (err, results) => {
      if (err) return res.status(500).json(err);
      if (results.length === 0) {
        return res.status(404).json({ message: 'Jadwal tidak ditemukan' });
      }

      db.query(
        'DELETE FROM schedules WHERE id = ?',
        [id],
        (err) => {
          if (err) return res.status(500).json(err);
          res.json({ message: 'Jadwal berhasil dihapus' });
        }
      );
    }
  );
};
