const compensationService = require('../services/compensation.service');
const Compensation = require('../models/compensation.model');
const LedgerEntry = require('../models/ledgerEntry.model');
const AppError = require('../utils/AppError');

/**
 * Tạo đề xuất bồi thường
 * POST /api/admin/tickets/:ticketId/compensations
 */
const proposeCompensation = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const { amount, reason, evidence } = req.body;

    const result = await compensationService.propose(
      ticketId,
      { amount: Number(amount), reason, evidence },
      req.user
    );

    res.status(201).json({
      status: 'success',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Duyệt đề xuất bồi thường
 * POST /api/admin/compensations/:id/approve
 */
const approveCompensation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { twoFactorToken } = req.body;

    const result = await compensationService.approve(
      id,
      req.user,
      { twoFactorToken }
    );

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Từ chối đề xuất bồi thường
 * POST /api/admin/compensations/:id/reject
 */
const rejectCompensation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await compensationService.reject(
      id,
      req.user,
      reason
    );

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Danh sách đề xuất bồi thường (có lọc theo state)
 * GET /api/admin/compensations
 */
const listCompensations = async (req, res, next) => {
  try {
    const { state, ticketId, orderId } = req.query;
    const query = {};
    if (state) query.state = state;
    if (ticketId) query.ticketId = ticketId;
    if (orderId) query.orderId = orderId;

    const compensations = await Compensation.find(query)
      .populate('proposedBy', 'fullName email csLevel')
      .populate('approvedBy', 'fullName email csLevel')
      .populate('walletOwnerId', 'fullName email companyName')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: compensations.length,
      data: compensations,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Xem sổ cái kế toán liên kết với đề xuất bồi thường
 * GET /api/admin/compensations/:id/ledger
 */
const getCompensationLedger = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ledger = await LedgerEntry.findOne({ compensationId: id })
      .populate('walletOwnerId', 'fullName email companyName')
      .populate('proposedBy', 'fullName email csLevel')
      .populate('approvedBy', 'fullName email csLevel');

    if (!ledger) {
      throw new AppError(404, 'LEDGER_ENTRY_NOT_FOUND', 'Không tìm thấy bút toán sổ cái cho đề xuất này');
    }

    res.status(200).json({
      status: 'success',
      data: ledger,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  proposeCompensation,
  approveCompensation,
  rejectCompensation,
  listCompensations,
  getCompensationLedger,
};
