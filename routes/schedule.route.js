const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

router.get('/', async (req, res) => {
  const { user_id } = req.query;

  try {
    let query = `
      SELECT * FROM schedules
    `;
    const params = [];

    if (user_id) {
      query += ' WHERE user_id = ?';
      params.push(user_id);
    }

    query += ' ORDER BY schedule_date ASC, schedule_time ASC';

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:userId', async (req, res) => {
  const { userId } = req.params;
  const { date, start_date, end_date } = req.query;

  try {
    let query = `
      SELECT * FROM schedules
      WHERE user_id = ?
    `;
    const params = [userId];

    if (date) {
      query += ' AND schedule_date = ?';
      params.push(date);
    } else if (start_date && end_date) {
      query += ' AND schedule_date BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    query += ' ORDER BY schedule_date ASC, schedule_time ASC';

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  const {
    user_id,
    title,
    type,
    schedule_date,
    schedule_time,
    location,
    notes,
    reminder,
  } = req.body;

  try {
    const [result] = await db.query(
      `INSERT INTO schedules
  (user_id, title, type, schedule_date, schedule_time, location, notes, reminder)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        title,
        type,
        schedule_date,
        schedule_time,
        location,
        notes,
        reminder,
      ],
    );

    res.status(201).json({
      message: 'Schedule added',
      id: result.insertId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const {
    title,
    type,
    schedule_date,
    schedule_time,
    location,
    notes,
    reminder,
  } = req.body;

  try {
    const [check] = await db.query('SELECT id FROM schedules WHERE id = ?', [
      id,
    ]);

    if (check.length === 0) {
      return res.status(404).json({ message: 'Schedule tidak ditemukan' });
    }

    await db.query(
      `
      UPDATE schedules SET
        title = ?,
        type = ?,
        schedule_date = ?,
        schedule_time = ?,
        location = ?,
        notes = ?,
        reminder = ?
      WHERE id = ?
      `,
      [
        title,
        type,
        schedule_date,
        schedule_time,
        location,
        notes,
        reminder,
        id,
      ],
    );

    res.json({ message: 'Schedule updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const [check] = await db.query('SELECT id FROM schedules WHERE id = ?', [
      req.params.id,
    ]);

    if (check.length === 0) {
      return res.status(404).json({ message: 'Schedule tidak ditemukan' });
    }

    await db.query('DELETE FROM schedules WHERE id = ?', [req.params.id]);

    res.json({ message: 'Schedule deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
