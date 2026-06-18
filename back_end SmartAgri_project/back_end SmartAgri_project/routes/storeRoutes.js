const express = require('express');
const {
  getStoreCategories,
  getStoreProducts,
} = require('../controllers/storeController');

const router = express.Router();

router.get('/store/products', getStoreProducts);
router.get('/store/categories', getStoreCategories);

module.exports = router;
