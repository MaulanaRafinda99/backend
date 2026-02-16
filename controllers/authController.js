const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  const { fullName, email, password, pregnancyWeek } = req.body;

  db.query(
    'SELECT * FROM users WHERE email = ?',
    [email],
    async (err, results) => {
      if (results.length > 0)
        return res
          .status(400)
          .json({ status: 'error', message: 'Email sudah terdaftar' });

      const hashed = await bcrypt.hash(password, 10);

      const query = `
        INSERT INTO users (full_name, email, pregnancy_week, password, role)
        VALUES (?,?,?,?,?)
      `;

      db.query(
        query,
        [fullName, email, pregnancyWeek, hashed, 'user'],
        error => {
          if (error)
            return res
              .status(500)
              .json({ status: 'error', message: 'Register gagal' });

          res.json({
            status: 'success',
            message: 'Register berhasil, silahkan login',
          });
        },
      );
    },
  );
};

exports.login = (req, res) => {
  const { email, password } = req.body;

  db.query(
    'SELECT * FROM users WHERE email = ?',
    [email],
    async (err, results) => {
      if (!results[0])
        return res
          .status(400)
          .json({ status: 'error', message: 'Email tidak ditemukan' });

      const user = results[0];

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch)
        return res
          .status(400)
          .json({ status: 'error', message: 'Password salah' });

      // JWT berisi id + role
      const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' },
      );

      res.json({
        status: 'success',
        message: 'Login berhasil',
        token,
        user: {
          id: user.id,
          fullName: user.full_name,
          email: user.email,
          pregnancyWeek: user.pregnancy_week,
          role: user.role,
        },
      });
    },
  );
};
