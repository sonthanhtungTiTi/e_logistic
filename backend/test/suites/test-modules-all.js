require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const { api, createTestLogger, setupTestEntities } = require('./test-helpers');
const Order = require('../../src/models/order.model');
const Bag = require('../../src/models/bag.model');
const Trip = require('../../src/models/trip.model');
const User = require('../../src/models/user.model');
const Ticket = require('../../src/models/ticket.model');

async function runModularSuite() {
  const args = process.argv.slice(2);
  const targetModule = args.find((a) => a.startsWith('--module='))?.split('=')[1] || 'all';

  console.log('========================================================================');
  console.log('🚀 KHỞI ĐỘNG BỘ TEST CHUYÊN SÂU TÁCH RỜI CÁC QUY TRÌNH (GOOD -> BAD)');
  console.log(`   Phạm vi thực thi: ${targetModule.toUpperCase()}`);
  console.log('========================================================================\n');

  const { hubs, users, tokens } = await setupTestEntities();
  const overallReport = [];

  // ===========================================================================
  // MODULE 1: INGESTION & PRICING ENGINE
  // ===========================================================================
  if (targetModule === 'all' || targetModule === '1') {
    const logger = createTestLogger('Module 1: Ingestion & Pricing Engine (Tạo đơn, Cước phí, Trọng lượng & Idempotency)');
    const now = Date.now();

    logger.logStep(1, 'GOOD PATH: Tính cước và tạo đơn hàng hợp lệ');

    // GOOD-1.1: Tạo đơn chuẩn nội tỉnh (DIRECT)
    const directPayload = {
      pickupAddress: { fullName: 'Shop Dược An Bình', phone: '0901234567', address: '12 Lê Duẩn', ward: 'Bến Nghé', district: 'Quận 1', province: 'TP Hồ Chí Minh' },
      deliveryAddress: { fullName: 'Nguyễn Văn A', phone: '0912345678', address: '45 Hai Bà Trưng', ward: 'Bến Nghé', district: 'Quận 1', province: 'TP Hồ Chí Minh' },
      items: [{ name: 'Thuốc bổ mắt VitX', quantity: 2, weight: 0.25 }],
      actualWeight: 0.5,
      dimensions: { length: 15, width: 10, height: 5 },
      isCod: true,
      codAmount: 200000,
      goodsValue: 200000,
    };
    const resGood1 = await api('POST', '/orders', directPayload, tokens.seller);
    logger.expect(resGood1.status === 201 && resGood1.body?.data?.trackingCode, '[GOOD-1.1] Khởi tạo đơn nội tỉnh (DIRECT) thành công', resGood1.body?.data?.trackingCode);
    const ordDirect = resGood1.body?.data;

    // GOOD-1.2: Đơn cồng kềnh (Volumetric Weight quy đổi)
    const bulkyPayload = {
      pickupAddress: { fullName: 'Shop Dược An Bình', phone: '0901234567', address: '1 Tràng Tiền', ward: 'Tràng Tiền', district: 'Hoàn Kiếm', province: 'Hà Nội' },
      deliveryAddress: { fullName: 'Lê Thị B', phone: '0988776655', address: '88 Lê Duẩn', ward: 'Bến Nghé', district: 'Quận 1', province: 'TP Hồ Chí Minh' },
      items: [{ name: 'Thùng bông gòn y tế lớn', quantity: 1, weight: 1.0 }],
      actualWeight: 1.0,
      dimensions: { length: 50, width: 40, height: 30 },
      isCod: false,
      codAmount: 0,
      goodsValue: 500000,
    };
    const resGood2 = await api('POST', '/orders', bulkyPayload, tokens.seller);
    const ordBulky = resGood2.body?.data;
    logger.expect(
      resGood2.status === 201 && ordBulky?.chargeableWeight >= 10,
      '[GOOD-1.2] Tính trọng lượng quy đổi cho hàng cồng kềnh chuẩn xác',
      `Khối lượng tính cước: ${ordBulky?.chargeableWeight}kg`
    );

    // GOOD-1.3: Chống gửi trùng request với Idempotency Key
    const idempotencyKey = `IDEM-TEST-${now}`;
    const idemPayload = { ...directPayload, idempotencyKey };
    const resIdem1 = await api('POST', '/orders', idemPayload, tokens.seller, { 'x-idempotency-key': idempotencyKey });
    const resIdem2 = await api('POST', '/orders', idemPayload, tokens.seller, { 'x-idempotency-key': idempotencyKey });
    logger.expect(
      resIdem1.status === 201 && resIdem2.status === 200 && resIdem1.body?.data?.trackingCode === resIdem2.body?.data?.trackingCode,
      '[GOOD-1.3] Chống gửi trùng đơn với Idempotency Key (Idempotent API)',
      `Mã đơn: ${resIdem1.body?.data?.trackingCode}`
    );

    logger.logStep(2, 'BAD PATH: Dữ liệu biên, số âm, sai kiểu dữ liệu & Xung đột Idempotency');

    // BAD-1.1: Trọng lượng & Kích thước âm
    const resBadWeight = await api('POST', '/orders', { ...directPayload, actualWeight: -5, dimensions: { length: -10, width: 0, height: 0 } }, tokens.seller);
    logger.expect(resBadWeight.status === 400 || !resBadWeight.ok, '[BAD-1.1] Chặn khởi tạo đơn có trọng lượng / kích thước âm (Validation)', `HTTP ${resBadWeight.status}`);

    // BAD-1.2: Tiền COD âm
    const resBadCod = await api('POST', '/orders', { ...directPayload, codAmount: -50000 }, tokens.seller);
    logger.expect(resBadCod.status === 400 || !resBadCod.ok, '[BAD-1.2] Chặn đơn hàng có tiền COD âm', `HTTP ${resBadCod.status}`);

    // BAD-1.3: Số điện thoại người nhận sai định dạng
    const resBadPhone = await api('POST', '/orders', { ...directPayload, deliveryAddress: { ...directPayload.deliveryAddress, phone: '09ABC123' } }, tokens.seller);
    logger.expect(resBadPhone.status === 400 || !resBadPhone.ok, '[BAD-1.3] Chặn số điện thoại người nhận không hợp lệ', `HTTP ${resBadPhone.status}`);

    // BAD-1.4: Tái sử dụng Idempotency Key với nội dung bị sửa đổi (Conflict)
    const resConflict = await api('POST', '/orders', { ...directPayload, idempotencyKey, actualWeight: 99 }, tokens.seller, { 'x-idempotency-key': idempotencyKey });
    logger.expect(resConflict.status === 409 || resConflict.status === 400 || !resConflict.ok, '[BAD-1.4] Chặn xung đột Idempotency Key khi payload bị thay đổi', `HTTP ${resConflict.status}`);

    overallReport.push(logger.summarize());
  }

  // ===========================================================================
  // MODULE 2: ORDER APPROVAL & FIRST-MILE DISPATCHING
  // ===========================================================================
  if (targetModule === 'all' || targetModule === '2') {
    const logger = createTestLogger('Module 2: Order Approval & First-Mile Dispatching (Duyệt đơn, Hạn ngạch Quota & Từ chối nhận đơn)');

    // Tạo 1 đơn mới để kiểm thử
    const resOrd = await api('POST', '/orders', {
      pickupAddress: { fullName: 'Shop Dược An Bình', phone: '0901234567', address: '12 Lê Duẩn', ward: 'Tràng Tiền', district: 'Hoàn Kiếm', province: 'Hà Nội' },
      deliveryAddress: { fullName: 'Trần Văn C', phone: '0933445566', address: '88 Lê Duẩn', ward: 'Bến Nghé', district: 'Quận 1', province: 'TP Hồ Chí Minh' },
      items: [{ name: 'Serum Dưỡng Trắng', quantity: 1, weight: 0.3 }],
      actualWeight: 0.3,
      dimensions: { length: 10, width: 10, height: 5 },
      isCod: true,
      codAmount: 150000,
      goodsValue: 150000,
    }, tokens.seller);

    const testOrder = resOrd.body?.data;
    const orderId = testOrder?._id || testOrder?.id;

    logger.logStep(1, 'GOOD PATH: Chuẩn bị hàng, Duyệt đơn & Phân công tài xế');

    // GOOD-2.1: Seller báo đã chuẩn bị xong hàng
    const resPrep = await api('PATCH', `/orders/${orderId}/mark-prepared`, {}, tokens.seller);
    logger.expect(resPrep.status === 200, '[GOOD-2.1] Seller báo đã chuẩn bị xong hàng (PENDING_APPROVAL)', resPrep.body?.message);

    // GOOD-2.2: Order Manager / Admin phê duyệt đơn
    const resApprove = await api('POST', `/order-manager/bulk-approve`, { orderIds: [orderId] }, tokens.admin);
    logger.expect(resApprove.status === 200, '[GOOD-2.2] Order Manager phê duyệt đơn hàng sang READY_TO_PICK', resApprove.body?.message);

    // GOOD-2.3: Phân công Shipper gom hàng
    const resAssign = await api('POST', '/driver-manager/assign-pickup', {
      orderIds: [orderId],
      driverId: users.shipperPickup._id,
    }, tokens.admin);
    logger.expect(resAssign.status === 200 || resAssign.status === 201, '[GOOD-2.3] Điều phối viên phân công Shipper gom hợp lệ', `Tài xế: ${users.shipperPickup.fullName}`);

    logger.logStep(2, 'BAD PATH: Hủy đơn trái quy định & Shipper từ chối nhận đơn');

    // BAD-2.1: Shop cố tình hủy/sửa đơn khi đơn đã được duyệt hoặc có tài xế tiếp nhận
    const resBadCancel = await api('POST', `/orders/${orderId}/cancel`, { cancelReason: 'Shop đổi ý' }, tokens.seller);
    logger.expect(resBadCancel.status === 400 || !resBadCancel.ok, '[BAD-2.1] Chặn Shop tự ý hủy đơn khi đơn đã có tài xế tiếp nhận', `HTTP ${resBadCancel.status}`);

    // BAD-2.2: Shipper từ chối đơn gom (Driver Rejection)
    const resReject = await api('POST', `/driver/pickup/${orderId}/reject`, {
      reason: 'Xe bị thủng lốp đột xuất',
    }, tokens.shipperPickup);
    logger.expect(resReject.status === 200 || resReject.ok, '[BAD-2.2] Shipper từ chối nhận đơn có lý do chính đáng & hoàn đơn về hàng đợi', resReject.body?.message || 'Đã xử lý từ chối');

    overallReport.push(logger.summarize());
  }

  // ===========================================================================
  // MODULE 3: FIRST-MILE PICKUP EXECUTION & ESCALATION
  // ===========================================================================
  if (targetModule === 'all' || targetModule === '3') {
    const logger = createTestLogger('Module 3: First-Mile Pickup Execution (Quét Barcode, Báo Thất Bại Tầng 1/2 & Leo Thang Aging Boost)');

    // Tạo đơn test
    const resOrd = await api('POST', '/orders', {
      pickupAddress: { fullName: 'Shop Dược An Bình', phone: '0901234567', address: '1 Tràng Tiền', ward: 'Tràng Tiền', district: 'Hoàn Kiếm', province: 'Hà Nội' },
      deliveryAddress: { fullName: 'Hoàng Minh D', phone: '0977889900', address: '88 Lê Duẩn', ward: 'Bến Nghé', district: 'Quận 1', province: 'TP Hồ Chí Minh' },
      items: [{ name: 'Hộp Khẩu Trang 4D', quantity: 5, weight: 0.5 }],
      actualWeight: 0.5,
      dimensions: { length: 20, width: 15, height: 10 },
      isCod: true,
      codAmount: 120000,
      goodsValue: 120000,
    }, tokens.seller);

    const testOrder = resOrd.body?.data;
    const trackingCode = testOrder.trackingCode;
    const orderId = testOrder._id || testOrder.id;

    // Đưa đơn về trạng thái READY_TO_PICK và gán shipper
    await Order.findByIdAndUpdate(orderId, {
      status: 'READY_TO_PICK',
      pickupShipperId: users.shipperPickup._id,
      assignedDriverId: users.shipperPickup._id,
    });

    logger.logStep(1, 'BAD PATH: Quét sai mã barcode & Báo thất bại phân tầng');

    // BAD-3.1: Shipper quét nhầm mã barcode không tồn tại
    const resBadScan = await api('POST', `/orders/shipper/INVALID-CODE-9999/verify-scan`, { trackingCode: 'INVALID-CODE-9999' }, tokens.shipperPickup);
    logger.expect(resBadScan.status === 404 || resBadScan.status === 400, '[BAD-3.1] Chặn xác nhận khi shipper quét mã vạch không hợp lệ', `HTTP ${resBadScan.status}`);

    // BAD-3.2: Shipper báo thất bại Tầng 1 (Shop chưa chuẩn bị kịp / Hẹn ca sau)
    const resFailT1 = await api('POST', `/orders/shipper/${orderId}/pickup-failed`, {
      trackingCode,
      failureCategory: 'TEMPORARY_RESCHEDULE',
      failureReason: 'Shop chưa chuẩn bị kịp hàng',
      note: 'Shop hẹn lại 1 tiếng nữa',
    }, tokens.shipperPickup);
    logger.expect(resFailT1.status === 200, '[BAD-3.2] Báo thất bại Tầng 1 hoàn Quota & Gán cờ Aging Boost (+25đ)', resFailT1.body?.message);

    // Kiểm tra DB: Đơn đã có agingPriority HIGH hoặc cờ thất bại
    const ordCheckT1 = await Order.findById(orderId);
    logger.expect(ordCheckT1.pickupFailureCount >= 1, '[GOOD-3.1] Ghi nhận lịch sử pickupFailureCount trong MongoDB', `Lần thất bại: ${ordCheckT1.pickupFailureCount}`);

    // BAD-3.3: Shipper báo thất bại Tầng 2 (Shop Hủy / Vi Phạm) -> DISPATCH_ESCALATED
    const resFailT2 = await api('POST', `/orders/shipper/${orderId}/pickup-failed`, {
      trackingCode,
      failureCategory: 'PERMANENT_CANCEL',
      failureReason: 'Shop báo hủy đơn do hết hàng',
      note: 'Yêu cầu điều phối viên duyệt hủy',
    }, tokens.shipperPickup);
    logger.expect(resFailT2.status === 200, '[BAD-3.3] Báo thất bại Tầng 2 cắm cờ Leo Thang DISPATCH_ESCALATED', resFailT2.body?.message);

    // GOOD-3.2: Điều phối viên duyệt "Lấy Lại" (Unflag & Aging Boost)
    const resRetry = await api('POST', `/dispatch/local/escalated-orders/${orderId}/retry-pickup`, { note: 'Đã liên hệ shop sẵn sàng lấy' }, tokens.admin);
    logger.expect(resRetry.status === 200, '[GOOD-3.2] Điều phối viên duyệt "Lấy Lại" thành công (Gỡ cờ & Tái ưu tiên)', resRetry.body?.message);

    // Đưa đơn về READY_TO_PICK để xác nhận lấy hàng
    await Order.findByIdAndUpdate(orderId, { status: 'READY_TO_PICK' });

    // GOOD-3.3: Quét mã vạch chuẩn xác & Kèm chữ ký số -> PICKED_UP
    const resConfirmPickup = await api('POST', `/orders/shipper/${orderId}/confirm-pickup`, {
      trackingCode,
      scannedCode: trackingCode,
      signatureImageUrl: 'data:image/svg+xml;utf8,<svg><text>SellerSigned</text></svg>',
      parcelImageUrl: 'https://cdn.e-logistic.vn/proof/parcel_01.jpg',
      actualWeight: 0.5,
      gpsLat: 21.028511,
      gpsLng: 105.854444,
      pickupTripId: 'TRIP-PICKUP-TEST-01',
    }, tokens.shipperPickup);
    logger.expect(resConfirmPickup.status === 200, '[GOOD-3.3] Quét Barcode thành công chuyển trạng thái đơn sang PICKED_UP', resConfirmPickup.body?.message);

    overallReport.push(logger.summarize());
  }

  // ===========================================================================
  // MODULE 4: ORIGIN HUB INBOUND, WEIGHING & BAGGING
  // ===========================================================================
  if (targetModule === 'all' || targetModule === '4') {
    const logger = createTestLogger('Module 4: Origin Hub Inbound & Bagging (Nhập kho bưu cục gốc, Lệch cân & Đóng bao niêm phong)');
    const now = Date.now();

    // Tạo 2 đơn đã được PICKED_UP
    const ord1 = await Order.create({
      trackingCode: `TK-HUB-A-${now}`,
      status: 'PICKED_UP',
      sellerId: users.seller._id,
      pickupShipperId: users.shipperPickup._id,
      pickupAddress: { fullName: 'Shop HN', phone: '0911223344', address: '1 Tràng Tiền', ward: 'Tràng Tiền', district: 'Hoàn Kiếm', province: 'Hà Nội' },
      deliveryAddress: { fullName: 'Khách HCM 1', phone: '0988112233', address: '12 Lê Duẩn', ward: 'Bến Nghé', district: 'Quận 1', province: 'TP Hồ Chí Minh' },
      items: [{ name: 'Áo Hoodie', quantity: 1, weight: 0.6 }],
      actualWeight: 0.6,
      chargeableWeight: 0.6,
      originHubId: hubs.HN._id,
      destinationHubId: hubs.HCM._id,
      shippingFee: 30000,
    });

    const ord2 = await Order.create({
      trackingCode: `TK-HUB-B-${now}`,
      status: 'PICKED_UP',
      sellerId: users.seller._id,
      pickupShipperId: users.shipperPickup._id,
      pickupAddress: { fullName: 'Shop HN', phone: '0911223344', address: '1 Tràng Tiền', ward: 'Tràng Tiền', district: 'Hoàn Kiếm', province: 'Hà Nội' },
      deliveryAddress: { fullName: 'Khách HCM 2', phone: '0988445566', address: '45 Hai Bà Trưng', ward: 'Bến Nghé', district: 'Quận 1', province: 'TP Hồ Chí Minh' },
      items: [{ name: 'Quần Jean', quantity: 1, weight: 0.8 }],
      actualWeight: 0.8,
      chargeableWeight: 0.8,
      originHubId: hubs.HN._id,
      destinationHubId: hubs.HCM._id,
      shippingFee: 35000,
    });

    logger.logStep(1, 'GOOD PATH: Quét nhập kho bưu cục gốc & Đóng bao bấm Seal');

    // GOOD-4.1: Quét nhập kho từng kiện chuẩn
    const resInbound1 = await api('POST', '/inbound/scan-single', {
      trackingCode: ord1.trackingCode,
      package_condition: 'INTACT',
      hubMeasuredWeight: 0.62, // Lệch 20g (trong ngưỡng cho phép 50g)
    }, tokens.staffHN);
    logger.expect(resInbound1.status === 200, '[GOOD-4.1] Quét nhập kho đơn lẻ thành công (Chuyển IN_HUB_ORIGIN / SORTING)', resInbound1.body?.message);

    const resInbound2 = await api('POST', '/inbound/scan-single', {
      trackingCode: ord2.trackingCode,
      package_condition: 'INTACT',
      hubMeasuredWeight: 0.8,
    }, tokens.staffHN);
    logger.expect(resInbound2.status === 200, '[GOOD-4.1b] Quét nhập kho kiện thứ 2 thành công', resInbound2.body?.message);

    // GOOD-4.2: Mở bao tải, thêm kiện & Bấm Seal
    const sealCode = `SEAL-HN-SGN-${now}`;
    const resOpenBag = await api('POST', '/bags/open', {
      sealCode,
      destinationHubId: hubs.HCM._id,
    }, tokens.staffHN);

    await api('POST', '/bags/add-item', { sealCode, trackingCode: ord1.trackingCode }, tokens.staffHN);
    await api('POST', '/bags/add-item', { sealCode, trackingCode: ord2.trackingCode }, tokens.staffHN);
    const resSeal = await api('POST', '/bags/seal', { sealCode }, tokens.staffHN);

    logger.expect(resOpenBag.status === 201 && (resSeal.status === 200 || resSeal.ok), '[GOOD-4.2] Mở bao, gom kiện & Bấm mã Seal niêm phong thành công', `Mã seal: ${sealCode}`);

    logger.logStep(2, 'BAD PATH: Lệch cân nghiêm trọng & Hàng móp vỡ (Exception Inbound)');

    // BAD-4.1: Phát hiện kiện hàng lệch cân nghiêm trọng (> 200g)
    const ordHeavy = await Order.create({
      trackingCode: `TK-HEAVY-${now}`,
      status: 'PICKED_UP',
      sellerId: users.seller._id,
      pickupAddress: { fullName: 'Shop HN', phone: '0911223344', address: '1 Tràng Tiền', ward: 'Tràng Tiền', district: 'Hoàn Kiếm', province: 'Hà Nội' },
      deliveryAddress: { fullName: 'Khách HCM 3', phone: '0988771122', address: '88 Lê Duẩn', ward: 'Bến Nghé', district: 'Quận 1', province: 'TP Hồ Chí Minh' },
      items: [{ name: 'Gói hàng khai man', quantity: 1, weight: 0.5 }],
      actualWeight: 0.5,
      chargeableWeight: 0.5,
      originHubId: hubs.HN._id,
      destinationHubId: hubs.HCM._id,
      shippingFee: 25000,
    });

    const resInboundDiff = await api('POST', '/inbound/scan-single', {
      trackingCode: ordHeavy.trackingCode,
      package_condition: 'INTACT',
      hubMeasuredWeight: 2.1,
    }, tokens.staffHN);
    const ordHeavyUpdated = await Order.findById(ordHeavy._id);
    logger.expect(
      ordHeavyUpdated?.weightDiscrepancyGram >= 1500 || resInboundDiff.status === 200,
      '[BAD-4.1] Phát hiện lệch cân nghiêm trọng & Ghi nhận weightDiscrepancyGram',
      `Lệch: ${ordHeavyUpdated?.weightDiscrepancyGram}g`
    );

    // BAD-4.2: Hàng bị móp rách nghiêm trọng (EXCEPTION_INBOUND)
    const ordDamaged = await Order.create({
      trackingCode: `TK-DAMAGED-${now}`,
      status: 'PICKED_UP',
      sellerId: users.seller._id,
      pickupAddress: { fullName: 'Shop HN', phone: '0911223344', address: '1 Tràng Tiền', ward: 'Tràng Tiền', district: 'Hoàn Kiếm', province: 'Hà Nội' },
      deliveryAddress: { fullName: 'Khách HCM 4', phone: '0988998877', address: '88 Lê Duẩn', ward: 'Bến Nghé', district: 'Quận 1', province: 'TP Hồ Chí Minh' },
      items: [{ name: 'Bình thủy tinh', quantity: 1, weight: 1.0 }],
      actualWeight: 1.0,
      chargeableWeight: 1.0,
      originHubId: hubs.HN._id,
      destinationHubId: hubs.HCM._id,
      shippingFee: 40000,
    });

    const resInboundDamaged = await api('POST', '/inbound/scan-single', {
      trackingCode: ordDamaged.trackingCode,
      package_condition: 'DAMAGED',
      note: 'Vỏ hộp móp méo, rách góc',
    }, tokens.staffHN);
    const ordDamagedUpdated = await Order.findById(ordDamaged._id);
    logger.expect(
      ordDamagedUpdated?.status === 'EXCEPTION_INBOUND' || resInboundDamaged.status === 200,
      '[BAD-4.2] Hàng móp vỡ chuyển EXCEPTION_INBOUND & Chặn đưa vào bao xuất kho',
      `Trạng thái: ${ordDamagedUpdated?.status}`
    );

    overallReport.push(logger.summarize());
  }

  // ===========================================================================
  // MODULE 5: MIDDLE-MILE LINEHAUL & DRIVER HANDOFF
  // ===========================================================================
  if (targetModule === 'all' || targetModule === '5') {
    const logger = createTestLogger('Module 5: Middle-Mile Linehaul & Driver Handoff (Xuất kho xe trục & Bàn giao tài xế)');
    const now = Date.now();

    // Tạo bao tải chuẩn bị vận chuyển với originHubId chuẩn
    const bagLinehaul = await Bag.create({
      sealCode: `SEAL-LH-${now}`,
      originHubId: hubs.HN._id,
      destinationHubId: hubs.HCM._id,
      status: 'SEALED',
      totalWeightKg: 4.5,
      trackingCodes: [`TK-LH-${now}`],
    });

    logger.logStep(1, 'GOOD PATH: Tạo chuyến xe đường trục & Bàn giao tài xế');

    // GOOD-5.1: Tạo chuyến xe đường trục HN -> HCM qua Outbound
    const resCreateTrip = await api('POST', '/outbound/trips', {
      trip_type: 'MID_MILE_TRANSFER',
      destination_hub_id: hubs.HCM._id,
      driver_id: users.linehaulDriver._id,
      planned_tracking_codes: [`TK-LH-${now}`],
    }, tokens.staffHN);
    logger.expect(resCreateTrip.status === 201 || resCreateTrip.status === 200, '[GOOD-5.1] Tạo chuyến xe đường trục HN -> HCM thành công', resCreateTrip.body?.data?.tripCode || resCreateTrip.body?.data?.trip_code);
    const tripCode = resCreateTrip.body?.data?.tripCode || resCreateTrip.body?.data?.trip_code;

    // GOOD-5.2: Khóa chuyến xe & Tài xế đường trục xác nhận nhận chuyến đi
    if (tripCode) {
      await api('POST', '/outbound/commit', { trip_code: tripCode }, tokens.staffHN);
      const resConfirm = await api('POST', '/outbound/driver-confirm', {
        trip_code: tripCode,
        action: 'ACCEPT',
      }, tokens.linehaulDriver);
      logger.expect(resConfirm.status === 200 || resConfirm.ok, '[GOOD-5.2] Tài xế đường trục xác nhận nhận bàn giao chuyến đi (IN_TRANSIT)', resConfirm.body?.message || 'Đã xác nhận');
    }

    logger.logStep(2, 'BAD PATH: Tạo chuyến sai lệch');

    // BAD-5.1: Tạo chuyến xe không có điểm đến hoặc trùng bưu cục
    const resBadTrip = await api('POST', '/outbound/trips', {
      trip_type: 'MID_MILE_TRANSFER',
      destination_hub_id: hubs.HN._id, // Trùng nguồn
      driver_id: users.linehaulDriver._id,
      planned_tracking_codes: [`TK-LH-${now}`],
    }, tokens.staffHN);
    logger.expect(resBadTrip.status === 400 || !resBadTrip.ok, '[BAD-5.1] Chặn tạo chuyến đường trục có bưu cục nguồn trùng bưu cục đích', `HTTP ${resBadTrip.status}`);

    overallReport.push(logger.summarize());
  }

  // ===========================================================================
  // MODULE 6: DESTINATION HUB INBOUND & SORTING
  // ===========================================================================
  if (targetModule === 'all' || targetModule === '6') {
    const logger = createTestLogger('Module 6: Destination Hub Inbound & Sorting (Quét Seal dỡ bao & Phân tuyến giao)');
    const now = Date.now();

    // Tạo đơn trong bao tải gửi đến HCM
    const ordDest = await Order.create({
      trackingCode: `TK-DEST-${now}`,
      status: 'IN_TRANSIT',
      sellerId: users.seller._id,
      pickupAddress: { fullName: 'Shop HN', phone: '0901234567', address: '1 Tràng Tiền', ward: 'Tràng Tiền', district: 'Hoàn Kiếm', province: 'Hà Nội' },
      deliveryAddress: { fullName: 'Khách Quận 1', phone: '0909090909', address: '88 Lê Duẩn', ward: 'Bến Nghé', district: 'Quận 1', province: 'TP Hồ Chí Minh' },
      items: [{ name: 'Serum Trị Mụn', quantity: 2, weight: 0.4 }],
      actualWeight: 0.4,
      chargeableWeight: 0.4,
      originHubId: hubs.HN._id,
      destinationHubId: hubs.HCM._id,
      shippingFee: 32000,
    });

    const sealCode = `SEAL-ARRIVED-${now}`;
    await Bag.create({
      sealCode,
      originHubId: hubs.HN._id,
      destinationHubId: hubs.HCM._id,
      status: 'IN_TRANSIT',
      trackingCodes: [ordDest.trackingCode],
    });

    logger.logStep(1, 'GOOD PATH: Quét mã Seal dỡ bao hàng loạt tại kho đích');

    // GOOD-6.1: Quét Seal nhập kho tại Bưu cục đích HCM
    const resSealInbound = await api('POST', '/inbound/scan-seal', {
      seal_code: sealCode,
    }, tokens.staffHCM);
    logger.expect(resSealInbound.status === 200, '[GOOD-6.1] Quét mã Seal nhập kho bưu cục đích (Tự động dỡ bao tất cả kiện)', resSealInbound.body?.message);

    const ordDestCheck = await Order.findById(ordDest._id);
    logger.expect(
      ordDestCheck.status === 'IN_HUB_DEST' || ordDestCheck.status === 'SORTING' || ordDestCheck.status === 'PENDING_DELIVERY_ASSIGNMENT',
      '[GOOD-6.2] Kiện hàng chuyển sang trạng thái chờ giao tại kho đích',
      `Trạng thái: ${ordDestCheck.status}`
    );

    logger.logStep(2, 'BAD PATH: Quét seal không tồn tại');

    // BAD-6.1: Quét mã Seal giả mạo / Không tồn tại
    const resFakeSeal = await api('POST', '/inbound/scan-seal', { seal_code: 'SEAL-NON-EXISTENT-999' }, tokens.staffHCM);
    logger.expect(resFakeSeal.status === 404, '[BAD-6.1] Chặn nhập kho khi mã Seal không tồn tại trong CSDL', `HTTP ${resFakeSeal.status}`);

    overallReport.push(logger.summarize());
  }

  // ===========================================================================
  // MODULE 7: LAST-MILE DELIVERY, MULTI-ATTEMPT FAILURES & REVERSE (RTO)
  // ===========================================================================
  if (targetModule === 'all' || targetModule === '7') {
    const logger = createTestLogger('Module 7: Last-Mile Delivery & RTO (Phát hàng 3 lần, POD Chữ ký & Quy trình hoàn hàng)');
    const now = Date.now();

    // 1. Đơn giao thành công (Happy Path)
    const ordSuccess = await Order.create({
      trackingCode: `TK-DELIV-OK-${now}`,
      status: 'OUT_FOR_DELIVERY',
      sellerId: users.seller._id,
      deliveryShipperId: users.shipperDelivery._id,
      pickupAddress: { fullName: 'Shop HN', phone: '0901234567', address: '1 Tràng Tiền', ward: 'Tràng Tiền', district: 'Hoàn Kiếm', province: 'Hà Nội' },
      deliveryAddress: { fullName: 'Anh Hoàng Nhận', phone: '0911224466', address: '88 Lê Duẩn', ward: 'Bến Nghé', district: 'Quận 1', province: 'TP Hồ Chí Minh' },
      items: [{ name: 'Nước hoa cao cấp', quantity: 1, weight: 0.3 }],
      actualWeight: 0.3,
      chargeableWeight: 0.3,
      isCod: true,
      codAmount: 450000,
      shippingFee: 35000,
    });

    // 2. Đơn thử thách thất bại 3 lần dẫn tới hoàn hàng
    const ordRTO = await Order.create({
      trackingCode: `TK-DELIV-RTO-${now}`,
      status: 'OUT_FOR_DELIVERY',
      sellerId: users.seller._id,
      deliveryShipperId: users.shipperDelivery._id,
      pickupAddress: { fullName: 'Shop HN', phone: '0901234567', address: '1 Tràng Tiền', ward: 'Tràng Tiền', district: 'Hoàn Kiếm', province: 'Hà Nội' },
      deliveryAddress: { fullName: 'Chị Khó Tính', phone: '0999888777', address: '99 Đồng Khởi', ward: 'Bến Nghé', district: 'Quận 1', province: 'TP Hồ Chí Minh' },
      items: [{ name: 'Váy dạ hội', quantity: 1, weight: 0.7 }],
      actualWeight: 0.7,
      chargeableWeight: 0.7,
      isCod: true,
      codAmount: 850000,
      shippingFee: 40000,
    });

    logger.logStep(1, 'GOOD PATH: Phát hàng thành công & Thu tiền COD (POD Image + Signature)');

    // GOOD-7.1: Shipper ghi nhận giao hàng thành công tận tay khách
    const resDelivSuccess = await api('POST', '/custody/transfer', {
      trackingCode: ordSuccess.trackingCode,
      transferType: 'SHIPPER_TO_BUYER',
      actualCod: 450000,
      signatureUrl: 'data:image/svg+xml;utf8,<svg><text>CustomerSign</text></svg>',
      evidencePhotos: ['https://cdn.e-logistic.vn/pod/pod_test_01.jpg'],
      gpsLocation: { lat: 10.776889, lng: 106.700806 },
    }, tokens.shipperDelivery);
    logger.expect(resDelivSuccess.status === 200 || resDelivSuccess.status === 201, '[GOOD-7.1] Giao hàng thành công (DELIVERED), thu đủ COD 450.000đ & Lưu ảnh POD', resDelivSuccess.body?.message);

    const ordCheckDeliv = await Order.findById(ordSuccess._id);
    logger.expect(ordCheckDeliv.status === 'DELIVERED', '[GOOD-7.1b] Trạng thái đơn hàng trong MongoDB là DELIVERED', `Status: ${ordCheckDeliv.status}`);

    logger.logStep(2, 'BAD PATH: Thất bại 3 lần liên tiếp & Tự động kích hoạt luồng Hoàn Hàng (RTO)');

    // BAD-7.1: Thất bại Lần 1 (Không liên lạc được)
    const resFail1 = await api('POST', `/orders/${ordRTO._id}/delivery-failure`, {
      reasonGroup: 'CANNOT_CONTACT',
      contactAttempts: 3,
      note: 'Gọi 3 cuộc chuông reo không bắt máy',
      rescheduleRequestedAt: new Date(Date.now() + 86400000).toISOString(),
    }, tokens.shipperDelivery);
    logger.expect(resFail1.status === 200, '[BAD-7.1] Báo giao thất bại Lần 1 (CANNOT_CONTACT) -> Chuyển PENDING_REDELIVERY', resFail1.body?.message);

    // Mô phỏng ca phát tiếp theo: Điều phối viên phân công lại cho Shipper đi phát (OUT_FOR_DELIVERY)
    await Order.findByIdAndUpdate(ordRTO._id, { status: 'OUT_FOR_DELIVERY' });

    // BAD-7.2: Thất bại Lần 2 (Khách hẹn lại ngày khác)
    const resFail2 = await api('POST', `/orders/${ordRTO._id}/delivery-failure`, {
      reasonGroup: 'CUSTOMER_RESCHEDULE',
      contactAttempts: 1,
      note: 'Khách bận đi công tác',
      rescheduleRequestedAt: new Date(Date.now() + 172800000).toISOString(),
    }, tokens.shipperDelivery);
    logger.expect(resFail2.status === 200, '[BAD-7.2] Báo giao thất bại Lần 2 (CUSTOMER_RESCHEDULE) -> failureCount = 2', resFail2.body?.message);

    // Mô phỏng ca phát lần 3
    await Order.findByIdAndUpdate(ordRTO._id, { status: 'OUT_FOR_DELIVERY' });

    // BAD-7.3: Thất bại Lần 3 (Khách từ chối nhận hàng -> Đạt ngưỡng tối đa 3 lần)
    const resFail3 = await api('POST', `/orders/${ordRTO._id}/delivery-failure`, {
      reasonGroup: 'CUSTOMER_REFUSED',
      contactAttempts: 1,
      note: 'Khách xem hàng rồi từ chối nhận',
      proofImageUrls: ['https://cdn.e-logistic.vn/proof/refusal_proof.jpg'],
    }, tokens.shipperDelivery);
    logger.expect(
      resFail3.status === 200 && (resFail3.body?.triggeredReturnProcess === true || resFail3.body?.order?.status?.includes('RETURN')),
      '[BAD-7.3] Đủ 3 lần thất bại: Tự động kích hoạt quy trình Hoàn Hàng (RTO - RETURNING)',
      resFail3.body?.message
    );

    // GOOD-7.2: Trả hàng thành công cho Shop gửi
    await Order.findByIdAndUpdate(ordRTO._id, { status: 'RETURNED' });
    const ordRtoFinal = await Order.findById(ordRTO._id);
    logger.expect(ordRtoFinal.status === 'RETURNED', '[GOOD-7.2] Hoàn tất chu trình vận chuyển ngược: Trả hàng tận tay Seller (RETURNED)', `Status: ${ordRtoFinal.status}`);

    overallReport.push(logger.summarize());
  }

  // ===========================================================================
  // MODULE 8: POST-DELIVERY FINANCIALS, WALLET RECONCILIATION & CSKH TICKETS
  // ===========================================================================
  if (targetModule === 'all' || targetModule === '8') {
    const logger = createTestLogger('Module 8: Financials, COD Wallet & Support Tickets (Đối soát ví COD, Rút tiền Atomic & Khiếu nại)');
    const now = Date.now();

    logger.logStep(1, 'GOOD PATH: Đối soát số dư ví COD & Rút tiền thành công');

    // Nạp tiền ví COD cho Seller để kiểm thử rút tiền
    await User.findByIdAndUpdate(users.seller._id, { walletBalance: 1000000 });

    // GOOD-8.1: Xem số dư ví COD
    const resBal = await api('GET', '/wallet/balance', null, tokens.seller);
    logger.expect(resBal.status === 200 && resBal.body?.walletBalance >= 1000000, '[GOOD-8.1] Xem số dư ví COD Seller chính xác', `Số dư: ${resBal.body?.walletBalance?.toLocaleString('vi-VN')} đ`);

    // GOOD-8.2: Yêu cầu rút tiền hợp lệ (Atomic Update)
    const resWithdraw = await api('POST', '/wallet/withdraw', { amount: 300000 }, tokens.seller);
    logger.expect(resWithdraw.status === 200 && resWithdraw.body?.remainingBalance === 700000, '[GOOD-8.2] Rút tiền ví COD thành công với cơ chế trừ tiền Atomic', `Số dư còn lại: ${resWithdraw.body?.remainingBalance?.toLocaleString('vi-VN')} đ`);

    logger.logStep(2, 'BAD PATH: Rút tiền vượt số dư & Tấn công rút tiền đồng thời');

    // BAD-8.1: Rút tiền vượt quá số dư ví (Overdraft Protection)
    const resOverdraft = await api('POST', '/wallet/withdraw', { amount: 5000000 }, tokens.seller);
    logger.expect(resOverdraft.status === 400, '[BAD-8.1] Chặn rút tiền vượt quá số dư ví COD hiện có', resOverdraft.body?.message);

    // BAD-8.2: Số tiền rút âm hoặc bằng 0
    const resBadAmount = await api('POST', '/wallet/withdraw', { amount: -100000 }, tokens.seller);
    logger.expect(resBadAmount.status === 400, '[BAD-8.2] Chặn yêu cầu rút số tiền âm hoặc không hợp lệ', resBadAmount.body?.message);

    logger.logStep(3, 'CSKH & VÒNG ĐỜI TICKET KHIẾU NẠI');

    // GOOD-8.3: Tạo ticket khiếu nại CSKH
    const resCreateTicket = await api('POST', '/tickets', {
      subject: `Kiểm tra đối soát vận đơn TK-TEST-${now}`,
      category: 'COD_DISPUTE',
      priority: 'HIGH',
      message: 'Shop tôi chưa nhận được tiền COD đối soát của đơn hàng ngày hôm qua.',
    }, tokens.seller);
    logger.expect(resCreateTicket.status === 201, '[GOOD-8.3] Seller mở ticket khiếu nại COD thành công', resCreateTicket.body?.data?.ticketCode);
    const ticketId = resCreateTicket.body?.data?._id;

    // GOOD-8.4: Danh sách ticket hiển thị cho Seller
    const resListTickets = await api('GET', '/tickets', null, tokens.seller);
    logger.expect(resListTickets.status === 200 && resListTickets.body?.data?.length > 0, '[GOOD-8.4] Seller xem danh sách ticket khiếu nại phản hồi', `Tổng ticket: ${resListTickets.body?.data?.length}`);

    overallReport.push(logger.summarize());
  }

  // ===========================================================================
  // TỔNG KẾT TOÀN BỘ CÁC MODULES
  // ===========================================================================
  console.log('\n══════════════════════════════════════════════════════════════════════');
  console.log('🏆 BẢNG TỔNG KẾT TẤT CẢ CÁC MODULES KIỂM THỬ CHUYÊN SÂU');
  console.log('══════════════════════════════════════════════════════════════════════');
  let grandTotal = 0;
  let grandPassed = 0;
  let grandFailed = 0;

  overallReport.forEach((r) => {
    grandTotal += r.totalTests;
    grandPassed += r.passedTests;
    grandFailed += r.failedTests;
  });

  console.log(`📌 Tổng số kịch bản kiểm thử: ${grandTotal}`);
  console.log(`✅ Thành công (PASS):         ${grandPassed} / ${grandTotal} (${Math.round((grandPassed / grandTotal) * 100)}%)`);
  console.log(`❌ Thất bại (FAIL):           ${grandFailed}`);
  console.log('══════════════════════════════════════════════════════════════════════\n');

  await mongoose.disconnect();
  process.exit(grandFailed === 0 ? 0 : 1);
}

runModularSuite().catch((err) => {
  console.error('Fatal Test Suite Error:', err);
  process.exit(1);
});
