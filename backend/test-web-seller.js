const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testSellerCreate() {
  console.log('--- TEST: Seller Login & Order Create via Web UI ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 },
  });

  try {
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    // 1. Login
    console.log('Navigating to Seller Login: http://localhost:5173/auth/login');
    await page.goto('http://localhost:5173/auth/login', { waitUntil: 'domcontentloaded' });

    await page.waitForSelector('button[type="submit"]', { timeout: 10000 });

    // Set email and password using React-compatible input dispatcher
    await page.evaluate(() => {
      const inputs = document.querySelectorAll('input');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(inputs[0], 'seller.demo@elogistic.vn');
      inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
      setter.call(inputs[1], 'Password123@');
      inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Submit
    console.log('Clicking Đăng nhập button...');
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => !window.location.href.includes('/auth/login'), { timeout: 10000 });
    console.log('Current URL after login:', page.url());

    // 2. Go to Create Order Page
    console.log('Navigating to: http://localhost:5173/seller/orders/create');
    await page.evaluate(() => { window.location.href = '/seller/orders/create'; });
    await new Promise(r => setTimeout(r, 3000));
    console.log('Current URL after navigating to create order:', page.url());

    // Fill receiver phone
    await page.waitForSelector('#input-receiver-phone', { timeout: 10000 });
    await page.type('#input-receiver-phone', '0988112233');

    // Fill receiver name
    await page.waitForSelector('#input-receiver-name');
    await page.type('#input-receiver-name', 'Anh Hùng Khách Hàng');

    // Fill detail address
    await page.waitForSelector('#input-detail-address');
    await page.type('#input-detail-address', '123 Đường Tân Bình');

    // Fill product name
    await page.waitForSelector('#product-name-1');
    await page.type('#product-name-1', 'Áo Thun Cotton Test');

    // Fill weight
    await page.waitForSelector('#product-weight-1');
    await page.click('#product-weight-1', { clickCount: 3 });
    await page.type('#product-weight-1', '1.0');

    // Click "Xác Nhận Tạo Đơn Hàng"
    console.log('Clicking "Xác Nhận Tạo Đơn Hàng"...');
    const buttons = await page.$$('button');
    let createBtn = null;
    for (const b of buttons) {
      const text = await page.evaluate(el => el.innerText, b);
      if (text && text.includes('Xác Nhận Tạo Đơn Hàng')) {
        createBtn = b;
        break;
      }
    }

    if (!createBtn) throw new Error('Could not find "Xác Nhận Tạo Đơn Hàng" button');
    await createBtn.click();

    // Wait for success modal or tracking code
    console.log('Waiting for Order Success Modal...');
    await page.waitForSelector('.font-mono.text-xl', { timeout: 10000 });
    const trackingCode = await page.$eval('.font-mono.text-xl', el => el.innerText.trim());
    console.log('✅ ORDER CREATED SUCCESSFULLY VIA WEB UI! Tracking Code:', trackingCode);

  } catch (err) {
    console.error('❌ Error in testSellerCreate:', err);
  } finally {
    await browser.close();
  }
}

testSellerCreate();
