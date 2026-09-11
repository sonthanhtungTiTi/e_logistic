const Product = require('../models/product.model');

// @desc    Lấy danh sách sản phẩm của Seller
// @route   GET /api/seller/products
// @access  Private (Seller)
exports.listProducts = async (req, res) => {
  try {
    const sellerId = req.sellerId || req.user._id;
    const { search, category, page = 1, limit = 50 } = req.query;

    const query = { sellerId };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }
    if (category && category !== 'ALL') {
      query.category = category;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [products, total] = await Promise.all([
      Product.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Product.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)) || 1,
      data: products,
    });
  } catch (error) {
    console.error('Lỗi listProducts:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể lấy danh sách sản phẩm',
      error: error.message,
    });
  }
};

// @desc    Lấy chi tiết 1 sản phẩm
// @route   GET /api/seller/products/:id
// @access  Private (Seller)
exports.getProductById = async (req, res) => {
  try {
    const sellerId = req.sellerId || req.user._id;
    const product = await Product.findOne({ _id: req.params.id, sellerId });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm hoặc bạn không có quyền truy cập',
      });
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error('Lỗi getProductById:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy thông tin sản phẩm',
    });
  }
};

// @desc    Tạo mới sản phẩm vào kho mẫu
// @route   POST /api/seller/products
// @access  Private (Seller)
exports.createProduct = async (req, res) => {
  try {
    const sellerId = req.sellerId || req.user._id;
    const { name, sku, weightKg, dimensions, priceVnd, category, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tên sản phẩm là bắt buộc',
      });
    }

    const numWeight = Number(weightKg);
    if (!numWeight || numWeight <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Khối lượng sản phẩm phải lớn hơn 0 kg',
      });
    }

    // Kiểm tra SKU trùng lặp nếu có nhập SKU
    if (sku && sku.trim()) {
      const existingSku = await Product.findOne({ sellerId, sku: sku.trim() });
      if (existingSku) {
        return res.status(400).json({
          success: false,
          message: `Mã SKU "${sku.trim()}" đã tồn tại trong danh mục của bạn`,
        });
      }
    }

    const product = await Product.create({
      sellerId,
      name: name.trim(),
      sku: sku ? sku.trim().toUpperCase() : '',
      weightKg: numWeight,
      dimensions: {
        length: Math.max(1, Number(dimensions?.length) || 10),
        width: Math.max(1, Number(dimensions?.width) || 10),
        height: Math.max(1, Number(dimensions?.height) || 10),
      },
      priceVnd: Math.max(0, Number(priceVnd) || 0),
      category: category ? category.trim() : 'Chung',
      description: description ? description.trim() : '',
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: 'Thêm sản phẩm thành công',
      data: product,
    });
  } catch (error) {
    console.error('Lỗi createProduct:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tạo sản phẩm mới',
      error: error.message,
    });
  }
};

// @desc    Cập nhật thông tin sản phẩm
// @route   PUT /api/seller/products/:id
// @access  Private (Seller)
exports.updateProduct = async (req, res) => {
  try {
    const sellerId = req.sellerId || req.user._id;
    const product = await Product.findOne({ _id: req.params.id, sellerId });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm để cập nhật',
      });
    }

    const { name, sku, weightKg, dimensions, priceVnd, category, description, isActive } = req.body;

    if (name) product.name = name.trim();
    if (weightKg !== undefined) {
      const w = Number(weightKg);
      if (w > 0) product.weightKg = w;
    }
    if (dimensions) {
      product.dimensions = {
        length: Math.max(1, Number(dimensions.length) || product.dimensions.length),
        width: Math.max(1, Number(dimensions.width) || product.dimensions.width),
        height: Math.max(1, Number(dimensions.height) || product.dimensions.height),
      };
    }
    if (priceVnd !== undefined) product.priceVnd = Math.max(0, Number(priceVnd) || 0);
    if (category) product.category = category.trim();
    if (description !== undefined) product.description = description.trim();
    if (isActive !== undefined) product.isActive = Boolean(isActive);

    if (sku && sku.trim().toUpperCase() !== product.sku) {
      const dup = await Product.findOne({
        sellerId,
        sku: sku.trim().toUpperCase(),
        _id: { $ne: product._id },
      });
      if (dup) {
        return res.status(400).json({
          success: false,
          message: `Mã SKU "${sku.trim()}" đã được dùng bởi sản phẩm khác`,
        });
      }
      product.sku = sku.trim().toUpperCase();
    }

    await product.save();

    res.status(200).json({
      success: true,
      message: 'Cập nhật sản phẩm thành công',
      data: product,
    });
  } catch (error) {
    console.error('Lỗi updateProduct:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi cập nhật sản phẩm',
      error: error.message,
    });
  }
};

// @desc    Xóa sản phẩm (hard delete hoặc soft delete)
// @route   DELETE /api/seller/products/:id
// @access  Private (Seller)
exports.deleteProduct = async (req, res) => {
  try {
    const sellerId = req.sellerId || req.user._id;
    const product = await Product.findOneAndDelete({ _id: req.params.id, sellerId });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm để xóa',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Đã xóa sản phẩm khỏi danh mục',
      data: { id: req.params.id },
    });
  } catch (error) {
    console.error('Lỗi deleteProduct:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể xóa sản phẩm',
      error: error.message,
    });
  }
};
