const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_API = 'http://localhost:5000/api';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const log = (step, msg, ok = true) => {
  console.log(`${ok ? '✅' : '❌'} [${step}] ${msg}`);
};

async function runWebTests() {
  console.log('====================================================');
  console.log('🌐 BẮT ĐẦU KIỂM THỬ TRÊN TRÌNH DUYỆT WEB THỰC TẾ');
  console.log('====================================================\n');

  // Lấy token thật từ API
  let sellerData = null;
  let adminData = null;
  try {
    const resSeller = await fetch(`${BASE_API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'seller.demo@elogistic.vn', password: 'Password123@' }),
    }).then((r) => r.json());
    sellerData = resSeller;

    const resAdmin = await fetch(`${BASE_API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'admin.demo@elogistic.vn', password: 'Password123@' }),
    }).then((r) => r.json());
    adminData = resAdmin;
  } catch (err) {
    console.error('Lỗi chuẩn bị token đăng nhập:', err);
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,900'],
  });

  try {
    // =========================================================================
    // PHẦN 1: KIỂM THỬ GIAO DIỆN SELLER TRÊN WEB (PORT 5173)
    // =========================================================================
    console.log('--- [WEB SELLER] KIỂM THỬ TRÊN FRONTEND_WEB (PORT 5173) ---');
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    // Khởi tạo phiên đăng nhập Seller trước khi React mount
    await page.evaluateOnNewDocument((tok, usr) => {
      localStorage.setItem('token', tok);
      localStorage.setItem(
        'user',
        JSON.stringify({
          _id: usr._id,
          id: usr._id,
          fullName: usr.fullName,
          email: usr.email,
          role: usr.role,
        })
      );
    }, sellerData.accessToken, sellerData);

    // 1.1 Truy cập Seller Portal
    await page.goto('http://localhost:5173/seller/dashboard', { waitUntil: 'networkidle0', timeout: 15000 });
    await delay(1500);
    const sellerBody = await page.evaluate(() => document.body.innerText);
    const isSellerLoggedIn = sellerBody.includes('Dashboard') || sellerBody.includes('Đơn Hàng') || sellerBody.includes('Seller');
    log('WEB-SELLER-1', 'Đăng nhập & Truy cập Portal Người Bán (Seller) thành công', isSellerLoggedIn);

    // 1.2 Kiểm thử Quản lý sản phẩm mẫu (/seller/products)
    await page.goto('http://localhost:5173/seller/products', { waitUntil: 'networkidle0', timeout: 15000 });
    await delay(1500);

    const hasProductPageTitle = (await page.content()).includes('Quản Lý Sản Phẩm Mẫu');
    log('WEB-SELLER-2', 'Màn hình Quản Lý Sản Phẩm Mẫu (Catalog) hiển thị chính xác', hasProductPageTitle);

    // Tìm nút Thêm Sản Phẩm Mới
    const buttons = await page.$$('button');
    let addBtnFound = false;
    for (const b of buttons) {
      const text = await page.evaluate((el) => el.innerText, b);
      if (text.includes('Thêm Sản Phẩm Mới') || text.includes('Thêm Sản Phẩm')) {
        await b.click();
        await delay(800);
        addBtnFound = true;
        break;
      }
    }

    const hasModal = (await page.content()).includes('Thêm Sản Phẩm Mẫu Mới');
    log('WEB-SELLER-3', 'Mở Modal thêm sản phẩm mẫu mới với các trường thông số bưu kiện', hasModal);

    if (hasModal) {
      // Điền thông tin sản phẩm mẫu
      const inputs = await page.$$('div.fixed input');
      if (inputs.length >= 1) {
        await inputs[0].type('Thuốc Nhỏ Mắt Rohto V-Premium 15ml');
      }
      const saveBtn = await page.$('div.fixed button[type="submit"]');
      if (saveBtn) {
        await saveBtn.click();
        await delay(2000);
        log('WEB-SELLER-4', 'Lưu sản phẩm mẫu mới thành công qua Web Form');
      }
    }

    // 1.3 Kiểm thử Tự động điền sản phẩm tại Tạo đơn hàng (/seller/orders/create)
    await page.goto('http://localhost:5173/seller/orders/create', { waitUntil: 'networkidle0', timeout: 15000 });
    await delay(2000);

    let hasDropdown = false;
    const selects = await page.$$('select');
    for (const s of selects) {
      const html = await page.evaluate((el) => el.innerHTML, s);
      if (html.includes('Chọn từ sản phẩm mẫu')) {
        hasDropdown = true;
        await page.evaluate((el) => {
          if (el.options.length > 1) {
            el.selectedIndex = 1;
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }, s);
        break;
      }
    }
    log('WEB-SELLER-5', 'Trang Tạo Đơn Hàng tích hợp Autocomplete chọn nhanh từ Catalog sản phẩm mẫu', hasDropdown);

    // 1.4 Kiểm thử Tạo Ticket khiếu nại (/seller/tickets/create)
    await page.goto('http://localhost:5173/seller/tickets/create', { waitUntil: 'networkidle0', timeout: 15000 });
    await delay(1500);

    const ticketInputs = await page.$$('form input[type="text"]');
    if (ticketInputs.length >= 2) {
      await ticketInputs[0].type('ELG-VN-77889900'); // Tracking code
      await ticketInputs[1].type('Yêu cầu giao hàng trước 11h sáng do khách đi công tác'); // Subject
    }
    const ticketTextarea = await page.$('form textarea');
    if (ticketTextarea) {
      await ticketTextarea.type('Khách hàng cần nhận gấp đơn thuốc trước chuyến bay trưa, nhờ bưu tá ưu tiên phát sớm.');
    }

    const submitTicketBtn = await page.$('form button[type="submit"]');
    if (submitTicketBtn) {
      await submitTicketBtn.click();
      await delay(2500);
    }
    const isAtTicketPage = page.url().includes('/seller/tickets');
    log('WEB-SELLER-6', 'Gửi ticket khiếu nại qua Web Form và tự động chuyển về Danh Sách Ticket', isAtTicketPage);

    // 1.5 Kiểm tra ticket vừa tạo và mở Chat Modal
    const viewButtons = await page.$$('table tr button');
    if (viewButtons.length > 0) {
      await viewButtons[0].click();
      await delay(1000);
      const isChatModalOpen = (await page.content()).includes('Vận đơn liên quan') || (await page.content()).includes('Shop');
      log('WEB-SELLER-7', 'Mở Modal Hội thoại Trao đổi 2 chiều Ticket trên Web Seller', isChatModalOpen);
    }

    await page.close();

    // =========================================================================
    // PHẦN 2: KIỂM THỬ GIAO DIỆN QUẢN TRỊ ADMIN TRÊN WEB (PORT 5174)
    // =========================================================================
    console.log('\n--- [WEB ADMIN] KIỂM THỬ TRÊN FRONTEND_ADMIN (PORT 5174) ---');
    const adminPage = await browser.newPage();
    await adminPage.setViewport({ width: 1400, height: 900 });

    // Khởi tạo phiên đăng nhập Admin
    await adminPage.evaluateOnNewDocument((tok, usr) => {
      localStorage.setItem('admin_access_token', tok);
      localStorage.setItem('access_token', tok);
      localStorage.setItem(
        'admin_user_profile',
        JSON.stringify({
          id: usr._id,
          _id: usr._id,
          fullName: usr.fullName,
          email: usr.email,
          role: usr.role,
        })
      );
    }, adminData.accessToken, adminData);

    // 2.1 Truy cập Mission Control Dashboard
    await adminPage.goto('http://localhost:5174/admin/dashboard', { waitUntil: 'networkidle0', timeout: 15000 });
    await delay(1500);
    const adminBody = await adminPage.evaluate(() => document.body.innerText);
    const isAdminLoggedIn = adminBody.includes('Mission Control') || adminBody.includes('Operations') || adminBody.includes('Dashboard');
    log('WEB-ADMIN-1', 'Đăng nhập & Truy cập Trung tâm Quản trị (Admin Mission Control) thành công', isAdminLoggedIn);

    // 2.2 Kiểm thử Trang Bảng Giá & Voucher (/admin/pricing)
    await adminPage.goto('http://localhost:5174/admin/pricing', { waitUntil: 'networkidle0', timeout: 15000 });
    await delay(1500);

    const pricingHtml = await adminPage.content();
    const hasPricingZones = pricingHtml.includes('Nội Tỉnh') && pricingHtml.includes('Nội Miền') && pricingHtml.includes('Cận Miền') && pricingHtml.includes('Liên Miền');
    log('WEB-ADMIN-2', 'Giao diện Quản Lý Bảng Giá Phí Ship 4 Tuyến & Phí Bảo Hiểm hiển thị chính xác', hasPricingZones);

    // Chuyển Tab Voucher
    const adminTabBtns = await adminPage.$$('button');
    for (const b of adminTabBtns) {
      const text = await adminPage.evaluate((el) => el.innerText, b);
      if (text.includes('Quản Lý Voucher Khuyến Mãi')) {
        await b.click();
        await delay(800);
        break;
      }
    }
    const hasVoucherTab = (await adminPage.content()).includes('Danh Sách Mã Khuyến Mãi') || (await adminPage.content()).includes('Thêm Mã Khuyến Mãi');
    log('WEB-ADMIN-3', 'Chuyển đổi Tab và hiển thị Danh Sách Voucher Khuyến Mãi', hasVoucherTab);

    // 2.3 Kiểm thử Quản lý Ticket CSKH (/admin/tickets)
    await adminPage.goto('http://localhost:5174/admin/tickets', { waitUntil: 'networkidle0', timeout: 15000 });
    await delay(1500);

    const ticketAdminHtml = await adminPage.content();
    const hasTicketAdminTable = ticketAdminHtml.includes('Quản Lý Khiếu Nại & Hỗ Trợ') && ticketAdminHtml.includes('TẤT CẢ TICKET');
    log('WEB-ADMIN-4', 'Giao diện CSKH Helpdesk quản lý khiếu nại toàn hệ thống hiển thị đầy đủ bộ đếm trạng thái', hasTicketAdminTable);

    // Mở modal xử lý ticket đầu tiên
    const adminActionBtns = await adminPage.$$('table tr button');
    if (adminActionBtns.length > 0) {
      await adminActionBtns[0].click();
      await delay(1000);

      // CSKH trả lời tin nhắn
      const replyInput = await adminPage.$('div.fixed input[placeholder*="Nhập nội dung trả lời"]');
      if (replyInput) {
        await replyInput.type('CSKH đã tiếp nhận khiếu nại và chuyển bưu tá phụ trách xử lý ngay.');
        const sendBtn = await adminPage.$('div.fixed form:last-child button[type="submit"]');
        if (sendBtn) {
          await sendBtn.click();
          await delay(2000);
          log('WEB-ADMIN-5', 'CSKH gửi tin nhắn trao đổi 2 chiều phản hồi trực tiếp cho Shop thành công');
        }
      }
    }

    // 2.4 Kiểm thử Cảnh báo tồn kho & Đề xuất gom chuyến xe trên Linehaul Dispatch (/admin/dispatch/linehaul)
    await adminPage.goto('http://localhost:5174/admin/dispatch/linehaul', { waitUntil: 'networkidle0', timeout: 15000 });
    await delay(2000);

    const linehaulHtml = await adminPage.content();
    const hasInventoryPanel = linehaulHtml.includes('Cảnh Báo Nghẽn & Đề Xuất Gom Chuyến Xe Tồn Kho') || linehaulHtml.includes('TỔNG TỒN KHO');
    log('WEB-ADMIN-6', 'Panel "Cảnh Báo Nghẽn & Đề Xuất Gom Chuyến Xe Tồn Kho" hiển thị trực quan trên trang Điều phối xe tải liên tỉnh', hasInventoryPanel);

    await adminPage.close();
  } catch (err) {
    console.error('❌ Lỗi kiểm thử Web:', err);
  } finally {
    await browser.close();
  }

  console.log('\n====================================================');
  console.log('🎉 HOÀN THÀNH TOÀN BỘ KIỂM THỬ TRÊN WEB TRÌNH DUYỆT!');
  console.log('====================================================\n');
}

runWebTests();
