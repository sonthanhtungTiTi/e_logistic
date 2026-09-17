const { DateTime, Settings } = require('luxon');
const mongoose = require('mongoose');
const {
  TIMEZONE,
  BUSINESS_HOURS,
  addBusinessMinutes,
  computeDueDates,
  pauseSla,
  resumeSla,
} = require('../../src/services/slaCalculator.service');
const { runSlaMonitorOnce } = require('../../src/jobs/slaMonitor.job');
const Ticket = require('../../src/models/ticket.model');
const Holiday = require('../../src/models/holiday.model');

describe('P2: SLA Engine & Auto-Priority Integration Tests', () => {
  let originalNow;

  beforeAll(async () => {
    originalNow = Settings.now;
  });

  afterAll(async () => {
    Settings.now = originalNow;
  });

  // ── TEST NHÁP / XÁC NHẬN MOCK LUXON SETTINGS.NOW HOẠT ĐỘNG CHÍNH XÁC ──────
  it('Xác nhận Luxon Settings.now mock thời gian xác định thành công', () => {
    const fixedTime = DateTime.fromISO('2026-06-15T10:00:00.000', { zone: TIMEZONE }).toMillis();
    Settings.now = () => fixedTime;

    const nowDt = DateTime.now().setZone(TIMEZONE);
    expect(nowDt.year).toBe(2026);
    expect(nowDt.month).toBe(6);
    expect(nowDt.day).toBe(15);
    expect(nowDt.hour).toBe(10);
  });

  // ── CASE 1: Ticket P3 tạo lúc 19:50 thứ Sáu (giờ VN) ──────────────────────
  it('Case 1: Ticket P3 tạo 19:50 thứ Sáu (không nghỉ cuối tuần, 12h/ngày) -> Hạn chót 48h làm việc rơi đúng 19:50 Thứ Ba tuần sau', async () => {
    // 2026-06-05 là Thứ Sáu
    const fridayEvening = DateTime.fromISO('2026-06-05T19:50:00.000', { zone: TIMEZONE }).toJSDate();
    const ticket = {
      priority: 'P3',
      createdAt: fridayEvening,
    };

    // P3: resolution = 48 giờ làm việc (2880 phút). Mỗi ngày làm việc từ 08:00 - 20:00 (12 giờ)
    // - Thứ 6: 19:50 -> 20:00 = 10 phút (còn 2870 phút)
    // - Thứ 7: 08:00 -> 20:00 = 720 phút (còn 2150 phút)
    // - Chủ Nhật: 08:00 -> 20:00 = 720 phút (còn 1430 phút)
    // - Thứ 2: 08:00 -> 20:00 = 720 phút (còn 710 phút)
    // - Thứ 3: 08:00 + 710 phút (11h 50p) = 19:50 Thứ 3 (2026-06-09)
    const { resolutionDueAt, firstResponseDueAt } = await computeDueDates(ticket, {
      now: fridayEvening,
      holidays: [],
    });

    const resDt = DateTime.fromJSDate(resolutionDueAt, { zone: TIMEZONE });
    expect(resDt.weekday).toBe(2); // Thứ Ba (Tuesday)
    expect(resDt.hour).toBe(19);
    expect(resDt.minute).toBe(50);
    expect(resDt.toFormat('yyyy-MM-dd HH:mm')).toBe('2026-06-09 19:50');

    // First response P3: 4 giờ (240 phút) -> Thứ 6 (10p) + Thứ 7 (230p từ 08:00 = 11:50 Thứ 7)
    const firstDt = DateTime.fromJSDate(firstResponseDueAt, { zone: TIMEZONE });
    expect(firstDt.weekday).toBe(6); // Thứ Bảy
    expect(firstDt.toFormat('yyyy-MM-dd HH:mm')).toBe('2026-06-06 11:50');
  });

  // ── CASE 2: Ticket P1 tạo lúc 23:00 -> Chế độ 24x7 ───────────────────────
  it('Case 2: Ticket P1 tạo lúc 23:00 -> is24x7=true -> Hạn phản hồi 23:15 cùng ngày, hạn xử lý 03:00 sáng hôm sau', async () => {
    const nightTime = DateTime.fromISO('2026-07-10T23:00:00.000', { zone: TIMEZONE }).toJSDate();
    const ticket = {
      priority: 'P1',
      createdAt: nightTime,
    };

    const { firstResponseDueAt, resolutionDueAt, is24x7 } = await computeDueDates(ticket, {
      now: nightTime,
      holidays: [],
    });

    expect(is24x7).toBe(true);

    const firstDt = DateTime.fromJSDate(firstResponseDueAt, { zone: TIMEZONE });
    expect(firstDt.toFormat('yyyy-MM-dd HH:mm')).toBe('2026-07-10 23:15');

    const resDt = DateTime.fromJSDate(resolutionDueAt, { zone: TIMEZONE });
    expect(resDt.toFormat('yyyy-MM-dd HH:mm')).toBe('2026-07-11 03:00');
  });

  // ── CASE 3: Tạm dừng SLA (WAITING_USER) 2 ngày và Resume ─────────────────
  it('Case 3: Ticket tạm dừng SLA (WAITING_USER) 2 ngày -> pausedMs xấp xỉ 2 ngày và hạn chót dời đúng 2 ngày', () => {
    const startDt = DateTime.fromISO('2026-08-01T09:00:00.000', { zone: TIMEZONE }).toJSDate();
    const initialDue = DateTime.fromISO('2026-08-05T18:00:00.000', { zone: TIMEZONE }).toJSDate();

    const ticket = {
      priority: 'P2',
      createdAt: startDt,
      sla: {
        firstResponseDueAt: initialDue,
        resolutionDueAt: initialDue,
        pausedMs: 0,
      },
    };

    // 1. Bắt đầu pause SLA vào ngày 2026-08-01 lúc 10:00
    const pauseTime = DateTime.fromISO('2026-08-01T10:00:00.000', { zone: TIMEZONE }).toJSDate();
    pauseSla(ticket, pauseTime);
    expect(ticket.sla.pauseStartedAt).toEqual(pauseTime);

    // 2. Tiếp tục (Resume) sau 2 ngày (48 giờ) vào ngày 2026-08-03 lúc 10:00
    const resumeTime = DateTime.fromISO('2026-08-03T10:00:00.000', { zone: TIMEZONE }).toJSDate();
    resumeSla(ticket, resumeTime);

    const expectedPausedMs = 48 * 60 * 60 * 1000;
    expect(ticket.sla.pausedMs).toBe(expectedPausedMs);
    expect(ticket.sla.pauseStartedAt).toBeNull();

    // Hạn chót resolutionDueAt phải dời thêm đúng 48 giờ
    const expectedNewDue = new Date(initialDue.getTime() + expectedPausedMs);
    expect(new Date(ticket.sla.resolutionDueAt).getTime()).toBe(expectedNewDue.getTime());
    const shiftedDt = DateTime.fromJSDate(ticket.sla.resolutionDueAt, { zone: TIMEZONE });
    expect(shiftedDt.toFormat('yyyy-MM-dd HH:mm')).toBe('2026-08-07 18:00');
  });

  // ── CASE 4: Tạo ticket rơi vào ngày lễ (30/4) -> Loại bỏ ngày lễ ──────────
  it('Case 4: Tạo ticket rơi vào ngày nghỉ lễ 30/4 -> Ngày lễ bị bỏ qua hoàn toàn khỏi quỹ giờ làm việc', () => {
    // 2026-04-30 là ngày lễ Giải Phóng Miền Nam
    const holidayDate = DateTime.fromISO('2026-04-30T10:00:00.000', { zone: TIMEZONE }).toJSDate();
    const holidays = ['2026-04-30', '2026-05-01']; // 30/4 và 1/5 nghỉ lễ liên tiếp

    // Cộng 12 giờ làm việc (720 phút) từ 30/4
    // Do 30/4 và 1/5 là ngày lễ, thời gian phải nhảy sang 08:00 ngày 02/05/2026 và cộng 12h -> kết thúc lúc 20:00 ngày 02/05/2026
    const targetDue = addBusinessMinutes(holidayDate, 720, {
      is24x7: false,
      holidays,
    });

    const targetDt = DateTime.fromJSDate(targetDue, { zone: TIMEZONE });
    expect(targetDt.toFormat('yyyy-MM-dd HH:mm')).toBe('2026-05-02 20:00');
  });

  // ── CASE 5: Kiểm tra Redis Lock phân tán cho slaMonitor job ───────────────
  it('Case 5: Chạy slaMonitor job đồng thời 2 lần trong cùng cửa sổ lock -> Lần thứ 2 bị chặn bởi Redis lock', async () => {
    let mockLockStore = {};
    const mockRedis = {
      async set(key, value, mode, duration, flag) {
        if (flag === 'NX' && mockLockStore[key]) {
          return null; // Khóa đã bị chiếm
        }
        mockLockStore[key] = value;
        return 'OK';
      },
      async hset() {
        return 1;
      },
    };

    const mockTicketModel = {
      find() {
        return {
          limit() {
            return [];
          },
        };
      },
    };

    // Lần 1: Lấy lock thành công
    const run1 = await runSlaMonitorOnce({
      redisClient: mockRedis,
      TicketModel: mockTicketModel,
      now: new Date(),
    });
    expect(run1.success).toBe(true);
    expect(run1.skipped).toBeUndefined();

    // Lần 2: Chạy ngay lập tức khi lock chưa nhả -> Bị chặn
    const run2 = await runSlaMonitorOnce({
      redisClient: mockRedis,
      TicketModel: mockTicketModel,
      now: new Date(),
    });
    expect(run2.success).toBe(true);
    expect(run2.skipped).toBe(true);
    expect(run2.reason).toBe('LOCK_HELD_BY_ANOTHER_INSTANCE');
  });
});
