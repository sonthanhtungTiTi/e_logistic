const express = require('express');
const router = express.Router();
const { protect, authorize, resolveSellerContext } = require('../middleware/auth.middleware');
const {
  createTicket,
  listSellerTickets,
  getTicketDetails,
  addTicketMessage,
  listAdminTickets,
  updateTicketStatus,
} = require('../controllers/ticket.controller');

// ==========================================
// ROUTES DÀNH CHO SELLER
// ==========================================
router.post('/', protect, authorize('SELLER'), resolveSellerContext, createTicket);
router.get('/', protect, authorize('SELLER'), resolveSellerContext, listSellerTickets);
router.get('/:id', protect, getTicketDetails);
router.post('/:id/messages', protect, addTicketMessage);

// ==========================================
// ROUTES DÀNH CHO CSKH & ADMIN
// ==========================================
router.get(
  '/admin/list',
  protect,
  authorize('ADMIN', 'ORDER_VENDOR_MANAGER', 'CS', 'CUSTOMER_SERVICE', 'OPERATIONS'),
  listAdminTickets
);
router.put(
  '/admin/:id',
  protect,
  authorize('ADMIN', 'ORDER_VENDOR_MANAGER', 'CS', 'CUSTOMER_SERVICE', 'OPERATIONS'),
  updateTicketStatus
);

module.exports = router;
