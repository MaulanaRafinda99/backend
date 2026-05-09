const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const modulController = require('../controllers/modul.controller');

// ================= MULTER CONFIG =================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log('mimetype:', file.mimetype);

    if (file.mimetype === 'application/pdf') {
      cb(null, 'uploads/moduls');
    } else if (file.mimetype.startsWith('image/')) {
      cb(null, 'uploads/thumbnails');
    } else {
      cb(new Error('File type tidak didukung'), null);
    }
  },

  filename: (req, file, cb) => {
    console.log('originalname:', file.originalname);
    console.log('mimetype:', file.mimetype);

    let ext = path.extname(file.originalname);

    // fallback kalau extension kosong
    if (!ext) {
      if (file.mimetype === 'application/pdf') {
        ext = '.pdf';
      } else if (file.mimetype.includes('jpeg')) {
        ext = '.jpg';
      } else if (file.mimetype.includes('png')) {
        ext = '.png';
      } else {
        ext = '';
      }
    }

    const fileName = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;

    cb(null, fileName);
  },
});

const upload = multer({ storage });

// ================= ROUTES =================

// GET all moduls
router.get('/', modulController.getAllModuls);

// GET single modul
router.get('/:id', modulController.getModulById);

// CREATE modul
router.post('/', modulController.createModul);

// UPDATE modul
router.put('/:id', modulController.updateModul);

// DELETE modul
router.delete('/:id', modulController.deleteModul);

// Upload file
router.post('/upload', upload.single('file'), modulController.uploadFile);

module.exports = router;
