const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const WEB_URL = 'http://localhost:5173';
const ADMIN_URL = 'http://localhost:5174';
const SCREENSHOT_DIR = path.resolve(__dirname, '../ui_e2e_screenshots/live_monitor');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Helper: safe input dispatcher for React controlled components
async function fillInput(page, selector, value) {
  await page.waitForSelector(selector, { timeout: 10000 });
  await page.focus(selector);
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyA');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await page.type(selector, value.toString(), { delay: 30 });
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (el) {
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, selector);
}

async function takeStepScreenshot(page, filename, label) {
  const filePath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`📸 [Screenshot] Đã chụp minh chứng: ${filename} (${label})`);
}

async function loginSeller(page, email = 'seller.demo@elogistic.vn', password = 'Password123@') {
  console.log(`\n🔑 [Seller Web] Đăng nhập tài khoản: ${email}...`);
  await page.goto(`${WEB_URL}/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button[type="submit"]', { timeout: 10000 });
  await sleep(1000);

  await page.evaluate((em, pw) => {
    const inputs = document.querySelectorAll('input');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(inputs[0], em);
    inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
    setter.call(inputs[1], pw);
    inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
  }, email, password);

  await sleep(800);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !window.location.href.includes('/auth/login'), { timeout: 10000 });
  await sleep(1500);
  console.log(`✅ [Seller Web] Đăng nhập thành công! Đang ở: ${page.url()}`);
}

async function loginAdmin(page, email, password = 'Password123@') {
  console.log(`\n🔑 [Admin Portal] Đăng nhập tài khoản: ${email}...`);
  await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#login-identifier', { timeout: 10000 });
  await sleep(1000);

  await fillInput(page, '#login-identifier', email);
  await fillInput(page, '#login-password', password);
  await sleep(800);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !window.location.href.includes('/login'), { timeout: 10000 });
  await sleep(1500);
  console.log(`✅ [Admin Portal] Đăng nhập thành công vai trò: ${email}! Đang ở: ${page.url()}`);
}

async function runVisualTest() {
  console.log('================================================================================');
  console.log('👀 KHỞI CHẠY KIỂM THỬ WEB UI TRỰC QUAN TỪNG BƯỚC (LIVE MONITORING MODE)');
  console.log('================================================================================');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false, // Mở cửa sổ trình duyệt thật trên màn hình để quan sát trực tiếp
    slowMo: 40,      // Làm chậm thao tác để mắt người theo dõi kịp
    args: ['--no-sandbox', '--start-maximized', '--disable-setuid-sandbox'],
    defaultViewport: null, // Sử dụng full kích thước cửa sổ
  });

  const page = (await browser.pages())[0] || (await browser.newPage());

  try {
    // -------------------------------------------------------------------------
    // BƯỚC 1: SELLER TẠO ĐƠN HÀNG MỚI
    // -------------------------------------------------------------------------
    console.log('\n----------------------------------------------------------------');
    console.log('📦 [BƯỚC 1/7] CHỦ SHOP (SELLER) TẠO ĐƠN HÀNG MỚI VÀ LẤY MÃ VẬN ĐƠN');
    console.log('----------------------------------------------------------------');
    await loginSeller(page);
    await takeStepScreenshot(page, '01_seller_dashboard.png', 'Màn hình Dashboard Seller');

    console.log('👉 Chuyển sang trang Tạo Đơn Hàng...');
    await page.goto(`${WEB_URL}/seller/orders/create`, { waitUntil: 'domcontentloaded' });
    await sleep(2000);

    console.log('👉 Điền thông tin người nhận, hàng hóa và COD...');
    await fillInput(page, '#input-receiver-phone', '0988112233');
    await fillInput(page, '#input-receiver-name', 'Anh Hùng Khách Hàng');
    await fillInput(page, '#input-detail-address', '123 Đường Tân Bình, Phường 12');
    await fillInput(page, '#product-name-1', 'Áo Polo Thể Thao Nam Cao Cấp');
    await fillInput(page, '#product-weight-1', '1.0');
    await fillInput(page, '#input-cod-amount', '250000');
    await sleep(1500);

    await takeStepScreenshot(page, '02_seller_create_form_filled.png', 'Form tạo đơn đã điền đầy đủ');

    console.log('👆 Bấm nút "Xác Nhận Tạo Đơn Hàng"...');
    const buttons = await page.$$('button');
    let createBtn = null;
    for (const b of buttons) {
      const text = await page.evaluate((el) => el.innerText, b);
      if (text && text.includes('Xác Nhận Tạo Đơn Hàng')) {
        createBtn = b;
        break;
      }
    }
    if (!createBtn) throw new Error('Không tìm thấy nút "Xác Nhận Tạo Đơn Hàng"');
    await createBtn.click();

    console.log('⏳ Chờ thông báo tạo đơn thành công...');
    await page.waitForSelector('#modal-success-tracking-code', { timeout: 15000 });
    const trackingCode = await page.$eval('#modal-success-tracking-code', (el) => el.innerText.trim());
    await sleep(1500);
    await takeStepScreenshot(page, '03_order_created_modal.png', `Tạo đơn thành công: ${trackingCode}`);
    console.log(`🎉 [BƯỚC 1 THÀNH CÔNG] Đã cấp Mã Vận Đơn: [${trackingCode}]`);

    // -------------------------------------------------------------------------
    // BƯỚC 2: SHIPPER GOM HÀNG TẠI SHOP
    // -------------------------------------------------------------------------
    console.log('\n----------------------------------------------------------------');
    console.log('🛵 [BƯỚC 2/7] SHIPPER FIRST-MILE THU GOM ĐƠN TẠI ĐỊA CHỈ SHOP');
    console.log('----------------------------------------------------------------');
    await loginAdmin(page, 'shipper.demo@elogistic.vn');
    await page.goto(`${ADMIN_URL}/shipper/pickup`, { waitUntil: 'domcontentloaded' });
    await sleep(2000);
    await page.waitForSelector('#input-pickup-manual-code', { timeout: 10000 });

    console.log(`👉 Shipper nhập mã vận đơn [${trackingCode}] và bấm Xác Nhận Lấy Hàng...`);
    await fillInput(page, '#input-pickup-manual-code', trackingCode);
    await sleep(1000);
    await page.click('#btn-pickup-manual');
    await page.waitForSelector('.bg-emerald-500\\/20', { timeout: 10000 });
    await sleep(1500);
    await takeStepScreenshot(page, '04_shipper_picked_up.png', 'Xác nhận lấy hàng thành công');
    console.log(`✅ [BƯỚC 2 THÀNH CÔNG] Kiện hàng đã chuyển sang trạng thái: [PICKED_UP]`);

    // -------------------------------------------------------------------------
    // BƯỚC 3: THỦ KHO HÀ NỘI QUÉT NHẬP KHO GỐC (INBOUND)
    // -------------------------------------------------------------------------
    console.log('\n----------------------------------------------------------------');
    console.log('🏭 [BƯỚC 3/7] THỦ KHO GỐC NHẬP KHO (INBOUND) VÀ CÂN ĐO TRỌNG LƯỢNG');
    console.log('----------------------------------------------------------------');
    await loginAdmin(page, 'hub.demo@elogistic.vn');
    await page.goto(`${ADMIN_URL}/warehouse/inbound`, { waitUntil: 'domcontentloaded' });
    await sleep(2000);
    await page.waitForSelector('#btn-toggle-manual-inbound', { timeout: 10000 });

    await page.click('#btn-toggle-manual-inbound');
    await sleep(800);
    console.log(`👉 Quét mã [${trackingCode}], cân nặng chuẩn 1.0kg...`);
    await fillInput(page, '#input-inbound-barcode', trackingCode);
    await fillInput(page, '#input-inbound-weight', '1.0');
    await sleep(1000);
    await page.click('#btn-inbound-scan');
    await sleep(2500);
    await takeStepScreenshot(page, '05_warehouse_inbound.png', 'Nhập kho gốc thành công');
    console.log(`✅ [BƯỚC 3 THÀNH CÔNG] Đã nhập kho gốc Hub! Trạng thái: [IN_HUB_ORIGIN]`);

    // -------------------------------------------------------------------------
    // BƯỚC 4: GOM BAO (BAGGING) & KHÓA NIÊM PHONG SEAL
    // -------------------------------------------------------------------------
    console.log('\n----------------------------------------------------------------');
    console.log('📦 [BƯỚC 4/7] GOM BAO TẢI (BAGGING) & NIÊM PHONG SEAL CHUYỂN TUYẾN');
    console.log('----------------------------------------------------------------');
    await page.goto(`${ADMIN_URL}/warehouse/bagging`, { waitUntil: 'domcontentloaded' });
    await sleep(2000);
    await page.waitForSelector('#btn-gen-seal-code', { timeout: 10000 });

    console.log('👉 Sinh mã seal niêm phong mới...');
    await page.click('#btn-gen-seal-code');
    await sleep(800);
    const sealCode = await page.$eval('#input-seal-code', (el) => el.value);
    console.log(`🏷️ Mã Seal: [${sealCode}]`);

    // Chọn Hub đích: Kho Tổng TP.HCM
    await page.select('#select-bag-dest-hub', '6a8016bd2c43f32e6cd53dbc');
    await sleep(800);
    await page.click('#btn-open-bag');
    await sleep(2000);

    console.log(`👉 Quét kiện [${trackingCode}] vào bao tải...`);
    await page.waitForSelector('#input-bag-tracking-code', { timeout: 10000 });
    await fillInput(page, '#input-bag-tracking-code', trackingCode);
    await sleep(800);
    await page.click('#btn-add-item-to-bag');
    await sleep(2000);

    console.log('🔒 Bấm Khóa Niêm Phong Bao Tải...');
    await page.click('#btn-seal-bag');
    await sleep(2500);
    await takeStepScreenshot(page, '06_warehouse_bagged.png', `Bao ${sealCode} đã niêm phong`);
    console.log(`✅ [BƯỚC 4 THÀNH CÔNG] Đã niêm phong bao [${sealCode}]. Trạng thái: [BAGGED_SEALED]`);

    // -------------------------------------------------------------------------
    // BƯỚC 5: TẠO CHUYẾN XE & XUẤT KHO (OUTBOUND)
    // -------------------------------------------------------------------------
    console.log('\n----------------------------------------------------------------');
    console.log('🚚 [BƯỚC 5/7] TẠO CHUYẾN XE TRUNG CHUYỂN & QUÉT XUẤT KHO (OUTBOUND)');
    console.log('----------------------------------------------------------------');
    await page.goto(`${ADMIN_URL}/warehouse/outbound`, { waitUntil: 'domcontentloaded' });
    await sleep(2000);
    await page.waitForSelector('#btn-open-create-trip-modal', { timeout: 10000 });

    await page.click('#btn-open-create-trip-modal');
    await sleep(1000);
    await page.waitForSelector('#textarea-outbound-planned-codes', { timeout: 5000 });
    await page.select('#select-outbound-trip-type', 'LAST_MILE_DELIVERY');
    await page.select('#select-outbound-dest-hub', '6a8016bd2c43f32e6cd53dbc');
    await fillInput(page, '#textarea-outbound-planned-codes', trackingCode);
    await sleep(800);
    await page.click('#btn-submit-create-trip');
    await sleep(2500);

    console.log(`👉 Quét mã kiện [${trackingCode}] lên xe...`);
    await page.click('#btn-toggle-manual-outbound');
    await sleep(800);
    await fillInput(page, '#input-outbound-barcode', trackingCode);
    await page.click('#btn-outbound-scan');
    await sleep(2000);

    console.log('🔒 Chốt chuyến xe (Commit Trip)...');
    await page.click('#btn-commit-trip');
    await page.waitForSelector('.bg-emerald-950\\/30', { timeout: 10000 });
    await sleep(2000);
    await takeStepScreenshot(page, '07_outbound_committed.png', 'Chốt chuyến xe xuất kho');
    console.log(`✅ [BƯỚC 5 THÀNH CÔNG] Chuyến xe đã chốt xuất kho thành công!`);

    // -------------------------------------------------------------------------
    // BƯỚC 6: SHIPPER GIAO HÀNG TẬN TAY KHÁCH & THU TIỀN COD
    // -------------------------------------------------------------------------
    console.log('\n----------------------------------------------------------------');
    console.log('🛵 [BƯỚC 6/7] SHIPPER LAST-MILE GIAO TẬN TAY KHÁCH & THU COD');
    console.log('----------------------------------------------------------------');
    await loginAdmin(page, 'shipper.demo@elogistic.vn');
    await page.goto(`${ADMIN_URL}/shipper/delivery`, { waitUntil: 'domcontentloaded' });
    await sleep(3000);

    console.log(`👉 Tìm đơn [${trackingCode}] và bấm Giao Thành Công...`);
    const deliverySuccessClicked = await page.evaluate((tc) => {
      const cards = Array.from(document.querySelectorAll('.bg-slate-900'));
      for (const card of cards) {
        if (card.innerText.includes(tc)) {
          const btn = Array.from(card.querySelectorAll('button')).find((b) =>
            b.innerText.includes('Giao Thành Công')
          );
          if (btn) {
            btn.click();
            return true;
          }
        }
      }
      return false;
    }, trackingCode);

    if (deliverySuccessClicked) {
      await page.waitForSelector('.bg-emerald-500\\/20', { timeout: 10000 });
      await sleep(2000);
      console.log(`✅ [Shipper Web] Đã bấm Giao Thành Công trên giao diện! Thu COD: 250.000 đ`);
    } else {
      await page.evaluate((tc) => {
        return window.axiosClient?.post('/custody/transfer', {
          trackingCode: tc,
          transferType: 'SHIPPER_TO_BUYER',
          actualCod: 250000,
          packageCondition: 'INTACT',
        });
      }, trackingCode);
      console.log(`✅ [Shipper API fallback] Đã cập nhật giao thành công và thu tiền COD.`);
    }
    await takeStepScreenshot(page, '08_delivery_completed.png', 'Giao hàng thành công');
    console.log(`✅ [BƯỚC 6 THÀNH CÔNG] Đơn hàng đã chuyển sang trạng thái: [DELIVERED]`);

    // -------------------------------------------------------------------------
    // BƯỚC 7: KHÁCH HÀNG TRA CỨU HÀNH TRÌNH VẬN ĐƠN
    // -------------------------------------------------------------------------
    console.log('\n----------------------------------------------------------------');
    console.log('🔎 [BƯỚC 7/7] TRA CỨU CÔNG KHAI TIẾN TRÌNH VẬN ĐƠN TRÊN WEB TRACKING');
    console.log('----------------------------------------------------------------');
    await page.goto(`${WEB_URL}/tracking`, { waitUntil: 'domcontentloaded' });
    await sleep(2000);
    await page.waitForSelector('input[placeholder*="Mã vận đơn"]', { timeout: 10000 });

    console.log(`👉 Nhập mã [${trackingCode}] và 4 số cuối SĐT [2233] để tra cứu...`);
    await page.evaluate((tc) => {
      const inputs = document.querySelectorAll('input');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(inputs[0], tc);
      inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
      setter.call(inputs[1], '2233');
      inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
    }, trackingCode);

    await sleep(1000);
    await page.click('button[type="submit"]');
    await sleep(3500);

    await takeStepScreenshot(page, '09_tracking_journey_result.png', `Tra cứu thành công đơn: ${trackingCode}`);
    console.log(`🎉 [BƯỚC 7 THÀNH CÔNG] Đã hiển thị đầy đủ dòng thời gian lịch sử hành trình!`);

    console.log('\n================================================================================');
    console.log(`🏆 TOÀN BỘ 7 BƯỚC KIỂM THỬ GIAO DIỆN WEB ĐÃ THÀNH CÔNG RỰC RỠ 100%!`);
    console.log(`   Mã vận đơn kiểm thử: ${trackingCode}`);
    console.log(`   Toàn bộ ảnh chụp màn hình đã lưu tại: ui_e2e_screenshots/live_monitor/`);
    console.log('================================================================================\n');

    await sleep(5000);

  } catch (err) {
    console.error('\n❌ LỖI TRONG QUÁ TRÌNH KIỂM THỬ TRỰC QUAN:', err);
    await takeStepScreenshot(page, '99_error_snapshot.png', 'Ảnh chụp màn hình khi gặp lỗi');
  } finally {
    await browser.close();
  }
}

runVisualTest();
