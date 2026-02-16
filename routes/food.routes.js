const express = require('express');
const router = express.Router();
const foodController = require('../controllers/food.controller');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/foods';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

router.get('/', foodController.getAllFoods);
router.post('/', upload.single('image'), foodController.createFood);
router.put('/:id', upload.single('image'), foodController.updateFood);
router.delete('/:id', foodController.deleteFood);

module.exports = router;
