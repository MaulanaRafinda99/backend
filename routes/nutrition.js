const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

/* =========================
   GET USER (PROFILE IBU)
========================= */
router.get('/user/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query(
      'SELECT id, full_name, email, pregnancy_week, daily_calories, daily_protein, daily_calcium, daily_iron, daily_folate FROM users WHERE id = ?',
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

/* =========================
   GET MASTER FOODS
========================= */
router.get('/foods', async (req, res) => {
  const search = req.query.search || '';
  try {
    const [rows] = await db.query(
      'SELECT * FROM foods WHERE name LIKE ? ORDER BY name ASC',
      [`%${search}%`],
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* =========================
   GET FOOD LOGS (HARIAN)
========================= */
router.get('/food-logs/:userId', async (req, res) => {
  const { userId } = req.params;
  const { date, start_date, end_date } = req.query;

  if (!userId || isNaN(userId)) {
    return res.status(400).json({ message: 'userId tidak valid' });
  }

  try {
    let query = `
        SELECT
   fl.id,
  fl.amount,
  fl.calories,
  fl.protein,
  fl.calcium,
  fl.iron,
  fl.folate,
  fl.log_time,
  fl.log_date, 
  f.name,
  f.icon,
  f.image      FROM food_logs fl
      LEFT JOIN foods f ON fl.food_id = f.id
      WHERE fl.user_id = ?
    `;
    const params = [userId];

    if (date) {
      query += ` AND DATE(fl.log_date) = DATE(?)`;
      params.push(date);
    } else if (start_date && end_date) {
      query += ` AND DATE(fl.log_date) BETWEEN DATE(?) AND DATE(?)`;
      params.push(start_date, end_date);
    } else {
      return res.status(400).json({
        message: 'Parameter date atau start_date & end_date wajib diisi',
      });
    }

    query += ` ORDER BY fl.log_date DESC`;

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Error food-logs:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* =========================
   ADD FOOD LOG
========================= */
router.post('/food-logs', async (req, res) => {
  const { user_id, food_id, amount, calories, protein, calcium, iron, folate } =
    req.body;

  try {
    await db.query(
      `
      INSERT INTO food_logs
      (user_id, food_id, amount, calories, protein, calcium, iron, folate, log_date, log_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), CURTIME())
      `,
      [user_id, food_id, amount, calories, protein, calcium, iron, folate],
    );

    res.status(201).json({ message: 'Food logged successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/* =========================
   DELETE FOOD LOG
========================= */
router.delete('/food-logs/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.query('DELETE FROM food_logs WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Data not found' });
    }

    res.json({ message: 'Food log deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
