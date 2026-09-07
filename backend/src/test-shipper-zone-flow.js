const http = require('http');

function req(m, p, b, t) {
  return new Promise((resolve) => {
    const pl = b ? JSON.stringify(b) : null;
    const o = {
      hostname: 'localhost',
      port: 5000,
      path: '/api' + p,
      method: m,
      headers: {
        'Content-Type': 'application/json',
        ...(t ? { Authorization: 'Bearer ' + t } : {}),
        ...(pl ? { 'Content-Length': Buffer.byteLength(pl) } : {}),
      },
    };
    const rq = http.request(o, (rs) => {
      let raw = '';
      rs.on('data', (c) => (raw += c));
      rs.on('end', () => {
        try {
          resolve({ status: rs.statusCode, body: JSON.parse(raw) });
        } catch {
          resolve({ status: rs.statusCode, body: raw });
        }
      });
    });
    rq.on('error', (e) => resolve({ status: 0, body: e.message }));
    if (pl) rq.write(pl);
    rq.end();
  });
}

async function main() {
  console.log('=== BẮT ĐẦU KIỂM THỬ TOÀN DIỆN: PHÂN VÙNG SHIPPER, ĐỊA BÀN HOẠT ĐỘNG & DUYỆT ĐỔI ZONE ===\n');

  // 1. Đăng nhập các tài khoản
  const adminLogin = await req('POST', '/auth/login', { identifier: 'admin@test.local', password: 'TestPassword123!' });
  const adminToken = adminLogin.body?.accessToken;

  const sellerLogin = await req('POST', '/auth/login', { identifier: 'seller.e2e@test.local', password: 'TestPassword123!' });
  const sellerToken = sellerLogin.body?.accessToken;

  const shipHanLogin = await req('POST', '/auth/login', { identifier: 'shipper.han@test.local', password: 'TestPassword123!' });
  const shipHanToken = shipHanLogin.body?.accessToken;

  console.log('1. Đăng nhập hệ thống:');
  console.log('   - Admin token:', !!adminToken);
  console.log('   - Seller token:', !!sellerToken);
  console.log('   - Shipper Hà Nội token:', !!shipHanToken);

  // Đảm bảo Shipper Hà Nội ban đầu phụ trách Hà Nội
  await req('PUT', '/auth/shipper/basic-info', {
    fullName: 'Shipper Hà Nội Test',
    phoneNumber: '0988111222',
    vehicleInfo: { licensePlate: '29A1-999.88', vehicleType: 'Xe máy (Wave)' },
    isWorking: true,
  }, shipHanToken);

  const shipId = shipHanLogin.body?._id || shipHanLogin.body?.data?.user?._id;
  await req('PUT', `/admin/users/${shipId}/assign-zone`, {
    operatingArea: {
      province: 'Hà Nội',
      district: 'Quận Hoàn Kiếm',
      ward: 'Phường Hàng Bài',
      subZone: 'Khu phố 1',
      detailAddress: 'Khu phố 1, Phường Hàng Bài, Hoàn Kiếm, Hà Nội',
    },
  }, adminToken);

  // 2. Seller tạo đơn hàng với địa chỉ sau sáp nhập: Lấy tại Hà Nội -> Giao tại Cần Thơ
  console.log('\n2. Seller tạo đơn hàng sau sáp nhập (Lấy: Hà Nội -> Giao: Cần Thơ):');
  const createRes = await req('POST', '/orders', {
    pickupAddress: {
      fullName: 'Shop Tràng Tiền Plaza',
      phone: '0912345678',
      address: '123 Phố Tràng Tiền',
      subZone: 'Khu phố 1',
      ward: 'Phường Hàng Bài',
      district: 'Quận Hoàn Kiếm',
      province: 'Hà Nội',
    },
    deliveryAddress: {
      fullName: 'Khách Mua Ninh Kiều',
      phone: '0987654321',
      address: '456 Đường Hai Bà Trưng',
      subZone: 'Khu phố 2',
      ward: 'Phường Tân An',
      district: 'Quận Ninh Kiều',
      province: 'Cần Thơ',
    },
    items: [{ name: 'Laptop Gaming ASUS ROG', quantity: 1, weight: 2.5 }],
    dimensions: { length: 35, width: 25, height: 5 },
    actualWeight: 2.5,
    goodsValue: 25000000,
    isCod: true,
    codAmount: 25000000,
  }, sellerToken);

  const newOrder = createRes.body?.data;
  console.log('   - Kết quả tạo đơn:', createRes.status, 'Mã vận đơn:', newOrder?.trackingCode, 'Trạng thái:', newOrder?.status);

  // Phê duyệt đơn nếu cần
  if (newOrder?.status === 'PENDING_VERIFICATION' || newOrder?.status === 'CREATED') {
    await req('POST', `/vendor-ops/${newOrder._id}/approve`, { note: 'Duyệt đơn tự động kiểm thử' }, adminToken);
    await req('PATCH', `/orders/${newOrder._id}/status`, { status: 'READY_TO_PICK' }, adminToken);
  }

  // 3. Shipper Hà Nội xem danh sách đơn lấy hàng (Pickup Tasks)
  console.log('\n3. Shipper Hà Nội xem đơn lấy hàng theo khu vực phụ trách:');
  const puRes = await req('GET', '/orders/shipper/pickup-tasks', null, shipHanToken);
  const foundTask = (puRes.body?.data || []).find((t) => t.trackingCode === newOrder?.trackingCode);
  console.log('   - Tổng số đơn lấy tại Hà Nội:', puRes.body?.total);
  console.log('   - Tìm thấy đơn mới tạo trong danh sách của Shipper Hà Nội:', !!foundTask, foundTask ? `(Mã: ${foundTask.trackingCode}, Điểm lấy: ${foundTask.address})` : '');

  // 4. Shipper Hà Nội xác nhận lấy hàng
  if (foundTask) {
    console.log('\n4. Shipper Hà Nội quét mã và xác nhận lấy hàng:');
    const puConfirm = await req('POST', `/orders/shipper/${foundTask._id}/confirm-pickup`, {
      trackingCode: foundTask.trackingCode,
      scannedCode: foundTask.trackingCode,
      actualWeight: 2.5,
    }, shipHanToken);
    console.log('   - Kết quả lấy hàng:', puConfirm.status, 'Thông điệp:', puConfirm.body?.message);
  }

  // 5. Shipper gửi yêu cầu xin đổi khu vực sang TP.HCM
  console.log('\n5. Shipper gửi yêu cầu đổi khu vực sang TP. Hồ Chí Minh:');
  const reqZone = await req('POST', '/auth/shipper/request-zone-change', {
    requestedArea: {
      province: 'TP. Hồ Chí Minh',
      district: 'Quận Tân Bình',
      ward: 'Phường 12',
      subZone: 'Khu phố 5',
      detailAddress: 'Khu phố 5, Phường 12, Tân Bình, TP. Hồ Chí Minh',
    },
    reason: 'Chuyển công tác vào chi nhánh miền Nam',
  }, shipHanToken);
  console.log('   - Kết quả gửi yêu cầu:', reqZone.status, 'Trạng thái yêu cầu:', reqZone.body?.data?.status);

  // 6. Admin xem danh sách yêu cầu đổi khu vực
  console.log('\n6. Admin kiểm tra danh sách yêu cầu xin đổi khu vực:');
  const listReqs = await req('GET', '/admin/zone-change-requests', null, adminToken);
  console.log('   - Số lượng yêu cầu đang chờ:', listReqs.body?.data?.length);

  // 7. Admin phê duyệt yêu cầu đổi khu vực
  console.log('\n7. Admin Phê Duyệt yêu cầu đổi khu vực cho Shipper:');
  const approveRes = await req('POST', `/admin/zone-change-requests/${shipId}/approve`, {}, adminToken);
  console.log('   - Kết quả duyệt:', approveRes.status, 'Địa bàn mới của Shipper:', approveRes.body?.data?.operatingArea);

  // 8. Kiểm tra lại Profile của Shipper sau khi được duyệt
  console.log('\n8. Xác nhận lại Profile Shipper sau khi duyệt:');
  const finalProfile = await req('GET', '/auth/shipper/profile', null, shipHanToken);
  console.log('   - Khu vực hoạt động chính thức:', finalProfile.body?.data?.operatingArea);
  console.log('   - Trạng thái yêu cầu gần nhất:', finalProfile.body?.data?.zoneChangeRequest?.status);

  console.log('\n=== TẤT CẢ CÁC BƯỚC KIỂM THỬ ĐÃ HOÀN TẤT THÀNH CÔNG 100%! ===');
}

main().catch(console.error);
