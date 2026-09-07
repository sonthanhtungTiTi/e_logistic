require('dotenv').config();
const mongoose = require('mongoose');
const kycService = require('../src/services/kyc.service');
const User = require('../src/models/user.model');
const Kyc = require('../src/models/kyc.model');
const KycLog = require('../src/models/kycLog.model');
const { submitKycSchema, rejectKycSchema } = require('../src/validations/kyc.validation');

async function runVerification() {
  console.log('🚀 BẮT ĐẦU KIỂM THỬ TOÀN DIỆN TÍNH NĂNG KYC (BUSINESS LOGIC & SECURITY)...\n');

  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/e-logistics';
  await mongoose.connect(mongoURI);
  console.log('✅ Kết nối MongoDB thành công.\n');

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      failedTests++;
    }
  }

  // Dọn dẹp dữ liệu test cũ nếu có
  const testSellerAEmail = 'test_kyc_seller_a@example.com';
  const testSellerBEmail = 'test_kyc_seller_b@example.com';
  const testAdminEmail = 'test_kyc_admin@example.com';

  await User.deleteMany({ email: { $in: [testSellerAEmail, testSellerBEmail, testAdminEmail] } });

  // 1. Khởi tạo 2 Seller và 1 Admin
  const sellerA = await User.create({
    fullName: 'Nguyễn Văn Test A',
    companyName: 'Shop Dược Phẩm A',
    phoneNumber: '0901111111',
    email: testSellerAEmail,
    password: 'password123',
    role: 'SELLER',
    kycStatus: 'NOT_SUBMITTED',
    kycVerified: false,
  });

  const sellerB = await User.create({
    fullName: 'Trần Thị Test B',
    companyName: 'Shop Thiết Bị Y Tế B',
    phoneNumber: '0902222222',
    email: testSellerBEmail,
    password: 'password123',
    role: 'SELLER',
    kycStatus: 'NOT_SUBMITTED',
    kycVerified: false,
  });

  const adminUser = await User.create({
    fullName: 'Admin Thẩm Định',
    phoneNumber: '0909999999',
    email: testAdminEmail,
    password: 'password123',
    role: 'ADMIN',
  });

  await Kyc.deleteMany({ sellerId: { $in: [sellerA._id, sellerB._id] } });
  await KycLog.deleteMany({ sellerId: { $in: [sellerA._id, sellerB._id] } });

  try {
    // -------------------------------------------------------------
    console.log('📋 1. KIỂM TRA VALIDATION SCHEMA:');
    // -------------------------------------------------------------
    // Test CCCD hợp lệ (12 số)
    const validCccd = submitKycSchema.validate({
      idType: 'CCCD',
      idNumber: '079099001122',
      idFullName: 'NGUYEN VAN TEST A',
    });
    assert(!validCccd.error, 'Validation: CCCD 12 số hợp lệ');

    // Test CCCD sai định dạng (10 số)
    const invalidCccd = submitKycSchema.validate({
      idType: 'CCCD',
      idNumber: '0790990011',
      idFullName: 'NGUYEN VAN TEST A',
    });
    assert(!!invalidCccd.error, 'Validation: CCCD không đủ 12 số bị chặn');

    // Test CMND hợp lệ (9 số)
    const validCmnd = submitKycSchema.validate({
      idType: 'CMND',
      idNumber: '025689741',
      idFullName: 'TRAN THI TEST B',
    });
    assert(!validCmnd.error, 'Validation: CMND 9 số hợp lệ');

    // Test lý do từ chối rỗng
    const emptyReject = rejectKycSchema.validate({ reason: '   ' });
    assert(!!emptyReject.error, 'Validation: Lý do từ chối rỗng bị chặn');

    // -------------------------------------------------------------
    console.log('\n📋 2. KIỂM TRA SUBMIT LẦN ĐẦU (NOT_SUBMITTED -> PENDING):');
    // -------------------------------------------------------------
    const mockFilesA = {
      idFrontImage: [{ filename: 'cccd_front_a.jpg' }],
      idBackImage: [{ filename: 'cccd_back_a.jpg' }],
    };

    const submitResultA = await kycService.submitKyc(
      sellerA._id,
      {
        idType: 'CCCD',
        idNumber: '079099001122',
        idFullName: 'NGUYEN VAN TEST A',
        // Thử nghiệm Mass Assignment Injection
        status: 'APPROVED',
        kycVerified: true,
      },
      mockFilesA,
      { ipAddress: '127.0.0.1', userAgent: 'JestTest' }
    );

    assert(submitResultA.status === 'PENDING', 'Submit lần đầu thành công chuyển sang PENDING');

    // Kiểm tra DB thực tế
    const kycDocA = await Kyc.findOne({ sellerId: sellerA._id });
    assert(kycDocA && kycDocA.status === 'PENDING', 'DB lưu trạng thái PENDING');
    assert(kycDocA.submissionCount === 1, 'Đếm số lần nộp submissionCount = 1');

    const userA = await User.findById(sellerA._id);
    assert(userA.kycStatus === 'PENDING' && userA.kycVerified === false, 'User model cập nhật PENDING và kycVerified = false');

    // Kiểm tra Mass Assignment
    assert(kycDocA.status !== 'APPROVED', 'Chống Mass Assignment: field status=APPROVED bị lọc bỏ');

    // -------------------------------------------------------------
    console.log('\n📋 3. KIỂM TRA CHẶN NỘP KHI ĐANG PENDING (ATOMIC GUARD):');
    // -------------------------------------------------------------
    let pendingConflictError = null;
    try {
      await kycService.submitKyc(
        sellerA._id,
        {
          idType: 'CCCD',
          idNumber: '079099001122',
          idFullName: 'NGUYEN VAN TEST A',
        },
        mockFilesA
      );
    } catch (e) {
      pendingConflictError = e;
    }

    assert(
      pendingConflictError && pendingConflictError.statusCode === 409,
      'Nộp lại khi đang PENDING bị chặn với mã 409 KYC_ALREADY_SUBMITTED'
    );

    // -------------------------------------------------------------
    console.log('\n📋 4. KIỂM TRA TỪ CHỐI HỒ SƠ (PENDING -> REJECTED KÈM LÝ DO):');
    // -------------------------------------------------------------
    const rejectResultA = await kycService.rejectKyc(
      sellerA._id,
      adminUser._id,
      'Ảnh mặt sau CCCD bị chói sáng, không rõ ngày cấp',
      { ipAddress: '127.0.0.1' }
    );

    assert(rejectResultA.status === 'REJECTED', 'Từ chối hồ sơ chuyển sang REJECTED');
    assert(
      rejectResultA.rejectionReason === 'Ảnh mặt sau CCCD bị chói sáng, không rõ ngày cấp',
      'Lưu đúng lý do từ chối'
    );

    const userARejected = await User.findById(sellerA._id);
    assert(userARejected.kycStatus === 'REJECTED' && !userARejected.kycVerified, 'User model cập nhật REJECTED');

    // -------------------------------------------------------------
    console.log('\n📋 5. KIỂM TRA NỘP LẠI (REJECTED -> PENDING + LƯU HISTORY):');
    // -------------------------------------------------------------
    const mockFilesA2 = {
      idFrontImage: [{ filename: 'cccd_front_a_v2.jpg' }],
      idBackImage: [{ filename: 'cccd_back_a_v2.jpg' }],
    };

    const resubmitResultA = await kycService.submitKyc(
      sellerA._id,
      {
        idType: 'CCCD',
        idNumber: '079099001122',
        idFullName: 'NGUYEN VAN TEST A',
      },
      mockFilesA2
    );

    assert(resubmitResultA.status === 'PENDING', 'Nộp lại sau khi bị từ chối chuyển sang PENDING');
    assert(resubmitResultA.submissionCount === 2, 'Tăng submissionCount lên 2');

    const kycDocAResubmitted = await Kyc.findOne({ sellerId: sellerA._id });
    assert(kycDocAResubmitted.history.length === 1, 'Lịch sử history lưu 1 snapshot lần nộp trước');
    assert(kycDocAResubmitted.history[0].status === 'REJECTED', 'Snapshot history lưu trạng thái REJECTED cũ');

    // -------------------------------------------------------------
    console.log('\n📋 6. KIỂM TRA PHÊ DUYỆT (PENDING -> APPROVED + DENORMALIZE):');
    // -------------------------------------------------------------
    const approveResultA = await kycService.approveKyc(sellerA._id, adminUser._id);
    assert(approveResultA.status === 'APPROVED', 'Phê duyệt chuyển sang APPROVED');

    const userAApproved = await User.findById(sellerA._id);
    assert(
      userAApproved.kycStatus === 'APPROVED' && userAApproved.kycVerified === true,
      'User model cập nhật kycVerified = true (O(1) fast check)'
    );

    // Thử nộp lại khi đã APPROVED -> phải bị chặn
    let approvedConflictError = null;
    try {
      await kycService.submitKyc(
        sellerA._id,
        {
          idType: 'CCCD',
          idNumber: '079099001122',
          idFullName: 'NGUYEN VAN TEST A',
        },
        mockFilesA2
      );
    } catch (e) {
      approvedConflictError = e;
    }
    assert(
      approvedConflictError && approvedConflictError.statusCode === 409,
      'Đã APPROVED bị khóa vĩnh viễn không được tự ý nộp lại (409 KYC_ALREADY_APPROVED)'
    );

    // -------------------------------------------------------------
    console.log('\n📋 7. KIỂM TRA CHỐNG IDOR KHI TRUY CẬP FILE ẢNH:');
    // -------------------------------------------------------------
    // Seller A có quyền xem ảnh của mình
    const canAccessOwn = await kycService.verifyFileAccess('cccd_front_a_v2.jpg', sellerA);
    assert(canAccessOwn === true, 'Chính chủ Seller A được xem ảnh của mình');

    // Seller B cố tình xem ảnh của Seller A -> Bị từ chối
    const canAccessOther = await kycService.verifyFileAccess('cccd_front_a_v2.jpg', sellerB);
    assert(canAccessOther === false, 'IDOR Protection: Seller B không xem được ảnh của Seller A');

    // Admin có quyền xem ảnh
    const canAdminAccess = await kycService.verifyFileAccess('cccd_front_a_v2.jpg', adminUser);
    assert(canAdminAccess === true, 'Admin có quyền xem ảnh để thẩm định');

    // -------------------------------------------------------------
    console.log('\n📋 8. KIỂM TRA CHE MỜ PII (MASKING ID NUMBER):');
    // -------------------------------------------------------------
    const masked1 = kycService.maskIdNumber('079099001122');
    assert(masked1 === '0790******22', `Che CCCD 12 số: 079099001122 -> ${masked1}`);

    const masked2 = kycService.maskIdNumber('025689741');
    assert(masked2 === '0250***41' || masked2.includes('*'), `Che CMND 9 số: 025689741 -> ${masked2}`);

    // -------------------------------------------------------------
    console.log('\n📋 9. KIỂM TRA RUNTIME DUPLICATE ID DETECTION:');
    // -------------------------------------------------------------
    // Seller B nộp cùng số CCCD với Seller A
    const mockFilesB = {
      idFrontImage: [{ filename: 'cccd_front_b.jpg' }],
      idBackImage: [{ filename: 'cccd_back_b.jpg' }],
    };

    await kycService.submitKyc(
      sellerB._id,
      {
        idType: 'CCCD',
        idNumber: '079099001122', // Cùng số với Seller A
        idFullName: 'TRAN THI TEST B',
      },
      mockFilesB
    );

    const pendingList = await kycService.listPendingKyc({ page: 1, limit: 10 });
    const pendingItemB = pendingList.items.find((i) => i.sellerId.toString() === sellerB._id.toString());
    assert(pendingItemB && pendingItemB.duplicateIdWarning === true, 'Phát hiện cảnh báo trùng CCCD runtime cho Seller B');
    assert(pendingItemB.duplicateCount >= 1, `duplicateCount = ${pendingItemB?.duplicateCount} (trùng với Seller A)`);

    const detailB = await kycService.getKycDetail(sellerB._id);
    assert(detailB.duplicateIdWarning === true, 'Chi tiết hồ sơ Seller B có cờ duplicateIdWarning');
    assert(
      detailB.duplicateShops.some((s) => s.sellerId.toString() === sellerA._id.toString()),
      'Danh sách shop trùng lặp hiển thị đúng Shop A của Seller A'
    );

    // -------------------------------------------------------------
    console.log('\n📋 10. KIỂM TRA AUDIT LOG:');
    // -------------------------------------------------------------
    const logs = await KycLog.find({ sellerId: sellerA._id }).sort({ createdAt: 1 });
    assert(logs.length >= 3, `Đã ghi nhận ${logs.length} bản ghi KycLog kiểm toán`);
    const actions = logs.map((l) => l.action);
    assert(
      actions.includes('SUBMIT') && actions.includes('REJECT') && actions.includes('APPROVE'),
      'KycLog ghi nhận đầy đủ luồng SUBMIT -> REJECT -> RESUBMIT -> APPROVE'
    );

    // -------------------------------------------------------------
    console.log('\n📋 11. KIỂM TRA MIDDLEWARE REQUIREVERIFIEDKYC (ORDER GATE):');
    // -------------------------------------------------------------
    const { requireVerifiedKyc } = require('../src/middleware/kyc.middleware');

    let isBlocked = false;
    const reqMockUnverified = {
      user: { role: 'SELLER', kycVerified: false, kycStatus: 'PENDING' },
    };
    const resMock = {
      status: (code) => ({
        json: (body) => {
          if (code === 403 && body.code === 'KYC_REQUIRED') {
            isBlocked = true;
          }
        },
      }),
    };
    requireVerifiedKyc(reqMockUnverified, resMock, () => {});
    assert(isBlocked, 'Chặn tạo đơn 403 KYC_REQUIRED khi Seller chưa xác minh');

    let isPassed = false;
    const reqMockVerified = {
      user: { role: 'SELLER', kycVerified: true, kycStatus: 'APPROVED' },
    };
    requireVerifiedKyc(reqMockVerified, resMock, () => {
      isPassed = true;
    });
    assert(isPassed, 'Cho phép tạo đơn qua next() khi Seller đã xác minh kycVerified = true');

    // Dọn dẹp dữ liệu test
    await User.deleteMany({ email: { $in: [testSellerAEmail, testSellerBEmail, testAdminEmail] } });
    await Kyc.deleteMany({ sellerId: { $in: [sellerA._id, sellerB._id] } });
    await KycLog.deleteMany({ sellerId: { $in: [sellerA._id, sellerB._id] } });

    console.log(`\n======================================================`);
    console.log(`🎯 KẾT QUẢ KIỂM THỬ: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log(`======================================================\n`);

    if (failedTests === 0) {
      console.log('🎉 100% CÁC KIỂM THỬ NGHIỆP VỤ & BẢO MẬT KYC ĐÃ VƯỢT QUA THÀNH CÔNG!');
      process.exit(0);
    } else {
      console.error('⚠️ Có bài test bị thất bại, vui lòng kiểm tra chi tiết bên trên.');
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Lỗi runtime trong quá trình test:', err);
    process.exit(1);
  }
}

runVerification();
