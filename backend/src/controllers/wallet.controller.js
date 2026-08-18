const User = require('../models/user.model');

// @desc    Xem số dư ví COD của Seller / Sub-account
// @route   GET /api/wallet/balance HOẶC GET /api/seller/wallet/balance
// @access  Private (VIEW_FINANCE)
const getWalletBalance = async (req, res) => {
  try {
    const sellerId = req.effectiveSellerId || req.user._id;
    const seller = await User.findById(sellerId).select('walletBalance companyName fullName email');
    if (!seller) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin Shop' });
    }

    return res.json({
      sellerId: seller._id,
      companyName: seller.companyName,
      walletBalance: seller.walletBalance || 0,
      currency: 'VND',
    });
  } catch (error) {
    console.error(`[Wallet Balance Error]:`, error);
    return res.status(500).json({ message: 'Lỗi khi lấy thông tin số dư ví' });
  }
};

// @desc    Tạo yêu cầu rút tiền ví COD (Atomic update chống Race Condition / Double-Withdrawal)
// @route   POST /api/wallet/withdraw HOẶC POST /api/seller/wallet/withdraw
// @access  Private (MANAGE_FINANCE)
const requestWithdrawal = async (req, res) => {
  try {
    const sellerId = req.effectiveSellerId || req.user._id;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Số tiền rút không hợp lệ' });
    }

    // Atomic Update: Chỉ khấu trừ NẾU walletBalance >= amount tại thời điểm ghi DB
    const seller = await User.findOneAndUpdate(
      { _id: sellerId, walletBalance: { $gte: amount } },
      { $inc: { walletBalance: -amount } },
      { new: true }
    );

    if (!seller) {
      const check = await User.findById(sellerId).select('walletBalance');
      if (!check) {
        return res.status(404).json({ message: 'Không tìm thấy thông tin Shop' });
      }
      return res.status(400).json({
        message: `Số dư ví COD không đủ (${(check.walletBalance || 0).toLocaleString('vi-VN')}đ).`,
      });
    }

    return res.json({
      message: 'Gửi yêu cầu rút tiền ví COD thành công!',
      withdrawnAmount: amount,
      remainingBalance: seller.walletBalance,
    });
  } catch (error) {
    console.error(`[Wallet Withdraw Error]:`, error);
    return res.status(500).json({ message: 'Lỗi khi xử lý yêu cầu rút tiền' });
  }
};

module.exports = {
  getWalletBalance,
  requestWithdrawal,
};
