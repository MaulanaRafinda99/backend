const jwt = require("jsonwebtoken");

exports.verifyAdmin = (req, res, next) => {
  const token = req.headers["authorization"];

  if (!token) {
    return res.status(401).json({
      status: "error",
      message: "Token tidak ditemukan",
    });
  }

  try {
    const decoded = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET);

    // cek role
    if (decoded.role !== "admin") {
      return res.status(403).json({
        status: "error",
        message: "Akses ditolak, hanya admin",
      });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      status: "error",
      message: "Token tidak valid",
    });
  }
};
