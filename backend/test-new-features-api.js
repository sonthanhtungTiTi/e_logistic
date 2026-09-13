/**
 * Automated End-to-End API Test for 4 New Features:
 * 1. Seller Product Catalog
 * 2. Admin Pricing Config & Vouchers
 * 3. 2-Way Customer Support & Ticket Helpdesk
 * 4. Warehouse Inventory Suggestions & Bottleneck Alerts
 */

const BASE_URL = 'http://localhost:5000/api';

const log = (step, title, ok = true) => {
  const icon = ok ? '✅' : '❌';
  console.log(`${icon} [${step}] ${title}`);
};

async function runTests() {
  console.log('====================================================');
  console.log('🚀 BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG CÁC API TÍNH NĂNG MỚI');
  console.log('====================================================\n');

  let sellerToken = '';
  let adminToken = '';
  let cskhToken = '';

  // ── BƯỚC 1: ĐĂNG NHẬP LẤY TOKEN ─────────────────────────────────────
  try {
    const resSeller = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'seller.demo@elogistic.vn', password: 'Password123@' }),
    }).then((r) => r.json());
    sellerToken = resSeller.accessToken || resSeller.token;
    log('AUTH-1', `Seller đăng nhập thành công (User: ${resSeller.fullName})`, !!sellerToken);

    const resAdmin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'admin.demo@elogistic.vn', password: 'Password123@' }),
    }).then((r) => r.json());
    adminToken = resAdmin.accessToken || resAdmin.token;
    log('AUTH-2', `Admin đăng nhập thành công (User: ${resAdmin.fullName})`, !!adminToken);

    const resCskh = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'vendormgr.demo@elogistic.vn', password: 'Password123@' }),
    }).then((r) => r.json());
    cskhToken = resCskh.accessToken || resCskh.token;
    log('AUTH-3', `CSKH / Vendor Manager đăng nhập thành công (User: ${resCskh.fullName})`, !!cskhToken);
  } catch (err) {
    console.error('Lỗi đăng nhập:', err);
    process.exit(1);
  }

  // ── MỤC 1: KIỂM THỬ QUẢN LÝ SẢN PHẨM (SELLER PRODUCT CATALOG) ────────
  console.log('\n--- [MỤC 1] KIỂM THỬ SELLER PRODUCT CATALOG ---');
  let createdProductId = '';
  try {
    // 1.1 Tạo sản phẩm mẫu
    const createRes = await fetch(`${BASE_URL}/seller/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sellerToken}` },
      body: JSON.stringify({
        name: 'Dược Phẩm Panadol Extra 500mg (Hộp 10 vỉ)',
        sku: 'PANADOL-EXT-' + Date.now().toString().slice(-4),
        weightKg: 0.35,
        dimensions: { length: 15, width: 8, height: 6 },
        priceVnd: 120000,
        category: 'Dược phẩm',
        description: 'Thuốc giảm đau hạ sốt chính hãng',
      }),
    }).then((r) => r.json());

    const isCreated = createRes.success && createRes.data?._id;
    createdProductId = createRes.data?._id;
    log('PRODUCT-1', `Tạo sản phẩm mẫu mới: "${createRes.data?.name}" (ID: ${createdProductId})`, isCreated);

    // 1.2 Lấy danh sách sản phẩm
    const listRes = await fetch(`${BASE_URL}/seller/products`, {
      headers: { Authorization: `Bearer ${sellerToken}` },
    }).then((r) => r.json());
    const foundProduct = listRes.data?.find((p) => p._id === createdProductId);
    log('PRODUCT-2', `Xem danh mục sản phẩm của Seller (Tổng: ${listRes.total || listRes.count})`, !!foundProduct);

    // 1.3 Cập nhật giá sản phẩm
    const updateRes = await fetch(`${BASE_URL}/seller/products/${createdProductId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sellerToken}` },
      body: JSON.stringify({ priceVnd: 135000 }),
    }).then((r) => r.json());
    log('PRODUCT-3', `Cập nhật thông tin sản phẩm (Giá mới: ${updateRes.data?.priceVnd} đ)`, updateRes.data?.priceVnd === 135000);
  } catch (err) {
    log('PRODUCT-ERR', `Lỗi kiểm thử Product Catalog: ${err.message}`, false);
  }

  // ── MỤC 2: KIỂM THỬ BẢNG GIÁ PHÍ SHIP & VOUCHER (ADMIN PRICING CMS) ────
  console.log('\n--- [MỤC 2] KIỂM THỬ QUẢN LÝ BẢNG GIÁ & VOUCHER CMS ---');
  try {
    // 2.1 Lấy cấu hình bảng giá hiện tại
    const pricingRes = await fetch(`${BASE_URL}/admin/pricing-config`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    const hasPricing = pricingRes.success && pricingRes.data?.pricing?.zones;
    log('PRICING-1', `Admin xem cấu hình bảng giá 4 tuyến & danh sách vouchers (Tổng voucher: ${pricingRes.data?.vouchers?.length})`, hasPricing);

    // 2.2 Tạo voucher khuyến mãi mới
    const testVoucherCode = 'AUTOTEST25';
    const voucherRes = await fetch(`${BASE_URL}/admin/vouchers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        code: testVoucherCode,
        description: 'Voucher test tự động giảm 25.000 đ',
        discountType: 'FIXED',
        value: 25000,
        active: true,
      }),
    }).then((r) => r.json());
    const isVoucherSaved = voucherRes.success && voucherRes.data?.some((v) => v.code === testVoucherCode);
    log('PRICING-2', `Admin tạo mã voucher khuyến mãi mới [${testVoucherCode}]`, isVoucherSaved);

    // 2.3 Thử tính cước (Quote) áp dụng voucher vừa tạo
    const quoteRes = await fetch(`${BASE_URL}/orders/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sellerToken}` },
      body: JSON.stringify({
        actualWeight: 0.5,
        dimensions: { length: 15, width: 10, height: 5 },
        pickupAddress: { province: 'Hà Nội' },
        deliveryAddress: { province: 'TP. Hồ Chí Minh' },
        goodsValue: 200000,
        discountCode: testVoucherCode,
      }),
    }).then((r) => r.json());

    const hasDiscount = quoteRes.success && quoteRes.data?.discountAmount === 25000;
    log('PRICING-3', `Hệ thống tính cước tự động áp dụng mã voucher [${testVoucherCode}]: Giảm ${quoteRes.data?.discountAmount} đ (Cước cuối: ${quoteRes.data?.shippingFee} đ)`, hasDiscount);

    // 2.4 Dọn dẹp: Xóa voucher test
    const delVoucherRes = await fetch(`${BASE_URL}/admin/vouchers/${testVoucherCode}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    log('PRICING-4', `Admin xóa voucher test sau khi kiểm thử`, delVoucherRes.success);
  } catch (err) {
    log('PRICING-ERR', `Lỗi kiểm thử Pricing: ${err.message}`, false);
  }

  // ── MỤC 3: KIỂM THỬ KHIẾU NẠI & HỖ TRỢ (TICKET HELPDESK 2 CHIỀU) ───────
  console.log('\n--- [MỤC 3] KIỂM THỬ QUẢN LÝ KHIẾU NẠI (TICKET HELPDESK) ---');
  let testTicketId = '';
  let testTicketCode = '';
  try {
    // 3.1 Seller tạo ticket khiếu nại
    const createTicketRes = await fetch(`${BASE_URL}/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sellerToken}` },
      body: JSON.stringify({
        category: 'DELIVERY_DELAY',
        priority: 'URGENT',
        trackingCode: 'ELG-VN-99887766',
        subject: 'Đơn thuốc cần giao gấp cho bệnh nhân trong ngày',
        content: 'Khách hàng đang cần gấp thuốc trong buổi chiều, phiền bưu cục ưu tiên phát sớm.',
      }),
    }).then((r) => r.json());

    const isTicketCreated = createTicketRes.success && createTicketRes.data?._id;
    testTicketId = createTicketRes.data?._id;
    testTicketCode = createTicketRes.data?.ticketCode;
    log('TICKET-1', `Seller gửi ticket khiếu nại thành công [${testTicketCode}] (Trạng thái: ${createTicketRes.data?.status})`, isTicketCreated);

    // 3.2 Seller xem danh sách ticket
    const sellerTicketList = await fetch(`${BASE_URL}/tickets`, {
      headers: { Authorization: `Bearer ${sellerToken}` },
    }).then((r) => r.json());
    const hasMyTicket = sellerTicketList.data?.some((t) => t._id === testTicketId);
    log('TICKET-2', `Seller xem danh sách ticket của mình (Tìm thấy [${testTicketCode}])`, hasMyTicket);

    // 3.3 CSKH xem danh sách ticket toàn hệ thống
    const adminTicketList = await fetch(`${BASE_URL}/tickets/admin/list`, {
      headers: { Authorization: `Bearer ${cskhToken}` },
    }).then((r) => r.json());
    const hasAdminTicket = adminTicketList.data?.some((t) => t._id === testTicketId);
    log('TICKET-3', `CSKH / Quản trị viên xem danh sách ticket toàn hệ thống (Tổng: ${adminTicketList.total})`, hasAdminTicket);

    // 3.4 CSKH phản hồi tin nhắn vào ticket
    const cskhReplyRes = await fetch(`${BASE_URL}/tickets/${testTicketId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cskhToken}` },
      body: JSON.stringify({
        message: 'Chào Shop, CSKH đã liên hệ bưu tá nội vùng để ưu tiên giao đơn này trước 15h00 hôm nay.',
      }),
    }).then((r) => r.json());
    const hasReply = cskhReplyRes.success && cskhReplyRes.data?.messages?.length === 2;
    log('TICKET-4', `CSKH gửi tin nhắn trao đổi 2 chiều vào ticket (Số tin nhắn: ${cskhReplyRes.data?.messages?.length})`, hasReply);

    // 3.5 CSKH cập nhật trạng thái RESOLVED và kết luận giải quyết
    const resolveRes = await fetch(`${BASE_URL}/tickets/admin/${testTicketId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cskhToken}` },
      body: JSON.stringify({
        status: 'RESOLVED',
        resolutionNote: 'Shipper đã giao thành công và có chữ ký xác nhận của bệnh nhân.',
      }),
    }).then((r) => r.json());
    const isResolved = resolveRes.success && resolveRes.data?.status === 'RESOLVED';
    log('TICKET-5', `CSKH cập nhật trạng thái RESOLVED & lưu kết luận giải quyết khiếu nại`, isResolved);

    // 3.6 Seller xem chi tiết ticket, kiểm tra kết luận
    const checkDetailRes = await fetch(`${BASE_URL}/tickets/${testTicketId}`, {
      headers: { Authorization: `Bearer ${sellerToken}` },
    }).then((r) => r.json());
    const sellerSeesResolution = checkDetailRes.data?.status === 'RESOLVED' && checkDetailRes.data?.resolutionNote;
    log('TICKET-6', `Seller xem chi tiết ticket: Nhận đầy đủ lịch sử chat và kết luận giải quyết`, !!sellerSeesResolution);
  } catch (err) {
    log('TICKET-ERR', `Lỗi kiểm thử Ticket: ${err.message}`, false);
  }

  // ── MỤC 4: KIỂM THỬ CẢNH BÁO TỒN KHO & ĐỀ XUẤT CHUYẾN XE (KHO TỔNG) ───
  console.log('\n--- [MỤC 4] KIỂM THỬ CẢNH BÁO TỒN KHO & ĐỀ XUẤT CHUYẾN XE ---');
  try {
    // 4.1 Lấy tổng hợp tồn kho & cảnh báo nghẽn khu vực (Zone Utilization)
    const summaryRes = await fetch(`${BASE_URL}/inventory/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    const hasSummary = summaryRes.success && summaryRes.data?.by_zone;
    log(
      'INVENTORY-1',
      `Điều phối viên lấy Báo cáo Tồn kho & Cảnh báo Sức chứa Zone (Tổng tồn: ${summaryRes.data?.total_items || 0} kiện, Số zones: ${summaryRes.data?.by_zone?.length || 0})`,
      hasSummary
    );

    // 4.2 Lấy danh sách đề xuất gom chuyến xe (Trip Suggestions)
    const suggestionsRes = await fetch(`${BASE_URL}/inventory/trip-suggestions`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    const hasSuggestions = suggestionsRes.success && Array.isArray(suggestionsRes.data);
    log('INVENTORY-2', `Hệ thống phân tích và trả về các đề xuất gom chuyến xe tự động (Số đề xuất: ${suggestionsRes.data?.length || 0})`, hasSuggestions);
  } catch (err) {
    log('INVENTORY-ERR', `Lỗi kiểm thử Inventory Suggestions: ${err.message}`, false);
  }

  console.log('\n====================================================');
  console.log('🎉 HOÀN THÀNH TẤT CẢ KỊCH BẢN KIỂM THỬ API!');
  console.log('====================================================\n');
}

runTests();
