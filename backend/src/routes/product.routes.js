const express = require('express');
const router = express.Router();
const { protect, authorize, resolveSellerContext } = require('../middleware/auth.middleware');
const {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/product.controller');

// Tất cả routes sản phẩm đều yêu cầu Seller authentication
router.use(protect, authorize('SELLER'), resolveSellerContext);

router.route('/')
  .get(listProducts)
  .post(createProduct);

router.route('/:id')
  .get(getProductById)
  .put(updateProduct)
  .delete(deleteProduct);

module.exports = router;
