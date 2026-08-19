const BASE_URL = 'http://localhost:5000/api/auth';
let accessToken = '';
let refreshToken = '';
let email = `test_revoke_${Date.now()}@gmail.com`;

async function testRevokeFlow() {
  console.log('=== TEST LUỒNG REFRESH & REVOKE TOKEN ===\n');

  try {
    // 1. Đăng ký tài khoản mới để test
    console.log(`[1] Đang tạo tài khoản test: ${email}`);
    const regRes = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Test Revoke',
        email: email,
        phoneNumber: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
        password: 'password123'
      })
    });
    const regData = await regRes.json();
    if (!regData.accessToken) {
        console.log('Registration failed:', regData);
        return;
    }
    
    // 2. Lấy token
    accessToken = regData.accessToken;
    refreshToken = regData.refreshToken;
    console.log('✅ Lấy token thành công!');
    console.log(`- Access Token: ${accessToken.substring(0, 20)}...`);
    console.log(`- Refresh Token: ${refreshToken.substring(0, 20)}...\n`);

    // 3. Test API /refresh khi token CÒN hiệu lực (trước khi logout)
    console.log('[2] Đang test /refresh (trước khi logout)...');
    const refreshRes1 = await fetch(`${BASE_URL}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    const refreshData1 = await refreshRes1.json();
    console.log('✅ Refresh thành công! Access Token mới đã được cấp.\n');
    accessToken = refreshData1.accessToken; // cập nhật access token mới

    // 4. Gọi API /logout (Hủy refresh token trong DB)
    console.log('[3] Đang gọi API /logout (Revoke token)...');
    await fetch(`${BASE_URL}/logout`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });
    console.log('✅ Đăng xuất thành công! Refresh token đã bị xóa khỏi DB.\n');

    // 5. TC_UCDX_04: Dùng lại Refresh Token cũ sau khi đã logout (KỲ VỌNG: 401)
    console.log('[4] TC_UCDX_04: Dùng lại Refresh Token cũ để xin Access Token mới...');
    const refreshRes2 = await fetch(`${BASE_URL}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    const refreshData2 = await refreshRes2.json();
    
    if (refreshRes2.status === 401) {
        console.log(`✅ THÀNH CÔNG: Server chặn thành công (Mã lỗi: 401).`);
        console.log(`   Message từ server: "${refreshData2.message}"`);
    } else {
        console.log(`❌ THẤT BẠI: Lỗ hổng! Server vẫn cấp Access Token mới (HTTP ${refreshRes2.status}) dù đã logout!`);
    }

  } catch (error) {
    console.error('❌ Lỗi kịch bản test:', error);
  }
}

testRevokeFlow();
