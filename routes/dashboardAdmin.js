const express = require('express');
const router = express.Router(); 
const mysql = require("mysql2/promise");

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

// Summary
router.get('/summary', async (req, res) => {
  try {
    const [ibuHamil] = await db.query(
      'SELECT COUNT(*) AS total FROM users'
    );

    const [makanan] = await db.query(
      'SELECT COUNT(*) AS total FROM foods'
    );

    // const [jadwal] = await db.query(
    //   `SELECT COUNT(*) AS total 
    //    FROM schedules 
    //    WHERE DATE(schedule_date) = CURDATE()`
    // );

    // const [nutrisi] = await db.query(
    //   'SELECT COUNT(*) AS total FROM nutritions'
    // );

    res.json({
      total_ibu_hamil: ibuHamil[0].total,
      total_makanan: makanan[0].total,
    //   jadwal_hari_ini: jadwal[0].total,
    //   total_nutrisi: nutrisi[0].total,
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;
