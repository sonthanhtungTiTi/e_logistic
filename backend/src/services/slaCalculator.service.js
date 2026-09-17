const { DateTime } = require('luxon');
const Holiday = require('../models/holiday.model');

const TIMEZONE = 'Asia/Ho_Chi_Minh';
const BUSINESS_HOURS = { start: 8, end: 20 }; // 08:00 - 20:00 (12 giờ làm việc / ngày)

const SLA_TIERS = {
  P1: { firstResponseMinutes: 15, resolutionMinutes: 240, is24x7: true },     // 15p / 4h (24/7)
  P2: { firstResponseMinutes: 60, resolutionMinutes: 1440, is24x7: false },   // 1h / 24h làm việc
  P3: { firstResponseMinutes: 240, resolutionMinutes: 2880, is24x7: false },  // 4h / 48h làm việc
  P4: { firstResponseMinutes: 480, resolutionMinutes: 4320, is24x7: false },  // 8h / 72h làm việc
};

/**
 * Chuẩn hoá danh sách ngày nghỉ lễ thành Set chuỗi 'YYYY-MM-DD'
 */
function normalizeHolidaySet(holidays = []) {
  const set = new Set();
  if (!Array.isArray(holidays)) return set;

  for (const h of holidays) {
    if (!h) continue;
    if (typeof h === 'string') {
      set.add(h.slice(0, 10));
    } else if (h instanceof Date) {
      const dt = DateTime.fromJSDate(h, { zone: TIMEZONE });
      set.add(dt.toFormat('yyyy-MM-dd'));
    } else if (h.date) {
      const dt = DateTime.fromJSDate(new Date(h.date), { zone: TIMEZONE });
      set.add(dt.toFormat('yyyy-MM-dd'));
    }
  }
  return set;
}

/**
 * Kiểm tra một thời điểm luxon DateTime có rơi vào ngày nghỉ lễ không
 */
function isHoliday(luxonDt, holidaySet) {
  const ymd = luxonDt.toFormat('yyyy-MM-dd');
  return holidaySet.has(ymd);
}

/**
 * Nhảy DateTime tới đầu khung giờ làm việc hợp lệ tiếp theo (08:00 ngày làm việc không nghỉ lễ)
 */
function advanceToNextWorkingDayStart(luxonDt, holidaySet) {
  let dt = luxonDt.plus({ days: 1 }).set({ hour: BUSINESS_HOURS.start, minute: 0, second: 0, millisecond: 0 });
  while (isHoliday(dt, holidaySet)) {
    dt = dt.plus({ days: 1 }).set({ hour: BUSINESS_HOURS.start, minute: 0, second: 0, millisecond: 0 });
  }
  return dt;
}

/**
 * Đưa thời điểm bắt đầu về trong khung giờ làm việc hợp lệ
 */
function alignToWorkingWindow(luxonDt, holidaySet) {
  let dt = luxonDt;
  
  // Nếu ngày hiện tại là ngày lễ, nhảy tới 08:00 ngày làm việc kế tiếp
  while (isHoliday(dt, holidaySet)) {
    dt = dt.plus({ days: 1 }).set({ hour: BUSINESS_HOURS.start, minute: 0, second: 0, millisecond: 0 });
  }

  // Nếu trước 08:00 sáng trên ngày làm việc hợp lệ
  if (dt.hour < BUSINESS_HOURS.start) {
    dt = dt.set({ hour: BUSINESS_HOURS.start, minute: 0, second: 0, millisecond: 0 });
  } else if (dt.hour >= BUSINESS_HOURS.end) {
    // Nếu sau 20:00 tối, nhảy sang 08:00 ngày làm việc kế tiếp
    dt = advanceToNextWorkingDayStart(dt, holidaySet);
  }

  return dt;
}

/**
 * Cộng thêm số phút làm việc hành chính (08:00–20:00, T2–CN, trừ ngày lễ VN)
 * @param {Date|string|number} startDate - Thời điểm bắt đầu
 * @param {number} minutes - Số phút cần cộng
 * @param {object} options - { is24x7: boolean, holidays: Array, now: Date }
 * @returns {Date}
 */
function addBusinessMinutes(startDate, minutes, options = {}) {
  const { is24x7 = false, holidays = [] } = options;
  if (!startDate) startDate = options.now || new Date();

  let dt = typeof startDate === 'string' || typeof startDate === 'number'
    ? DateTime.fromISO(new Date(startDate).toISOString(), { zone: TIMEZONE })
    : DateTime.fromJSDate(new Date(startDate), { zone: TIMEZONE });

  // 1. Chế độ 24x7 (áp dụng cho P1 khẩn cấp)
  if (is24x7) {
    return dt.plus({ minutes }).toJSDate();
  }

  // 2. Chế độ giờ làm việc hành chính
  const holidaySet = normalizeHolidaySet(holidays);
  let remainingMinutes = Math.max(0, Number(minutes) || 0);

  // Đưa về mốc làm việc hợp lệ ban đầu
  dt = alignToWorkingWindow(dt, holidaySet);

  while (remainingMinutes > 0) {
    // Đảm bảo dt luôn nằm trong khung hợp lệ
    while (isHoliday(dt, holidaySet) || dt.hour >= BUSINESS_HOURS.end) {
      dt = advanceToNextWorkingDayStart(dt, holidaySet);
    }
    if (dt.hour < BUSINESS_HOURS.start) {
      dt = dt.set({ hour: BUSINESS_HOURS.start, minute: 0, second: 0, millisecond: 0 });
    }

    // Tính số phút còn lại trong ngày hôm nay (từ dt đến 20:00)
    const currentMinutesFromMidnight = dt.hour * 60 + dt.minute + (dt.second > 0 ? 1 : 0);
    const endMinutesFromMidnight = BUSINESS_HOURS.end * 60;
    const availableMinutesToday = Math.max(0, endMinutesFromMidnight - currentMinutesFromMidnight);

    if (remainingMinutes <= availableMinutesToday) {
      dt = dt.plus({ minutes: remainingMinutes });
      remainingMinutes = 0;
      break;
    } else {
      remainingMinutes -= availableMinutesToday;
      dt = advanceToNextWorkingDayStart(dt, holidaySet);
    }
  }

  return dt.toJSDate();
}

/**
 * Tính hạn chót phản hồi đầu tiên (firstResponseDueAt) và xử lý hoàn tất (resolutionDueAt)
 * @param {object} ticket
 * @param {object} options - { holidays: Array, now: Date }
 */
async function computeDueDates(ticket, options = {}) {
  const priority = (ticket.priority || 'P3').toUpperCase();
  const tier = SLA_TIERS[priority] || SLA_TIERS.P3;

  let holidays = options.holidays;
  if (!holidays && Holiday?.find) {
    try {
      holidays = await Holiday.find({}).lean();
    } catch (err) {
      holidays = [];
    }
  }

  const baseDate = ticket.createdAt ? new Date(ticket.createdAt) : (options.now ? new Date(options.now) : new Date());

  const firstResponseDueAt = addBusinessMinutes(baseDate, tier.firstResponseMinutes, {
    is24x7: tier.is24x7,
    holidays,
    now: baseDate,
  });

  const resolutionDueAt = addBusinessMinutes(baseDate, tier.resolutionMinutes, {
    is24x7: tier.is24x7,
    holidays,
    now: baseDate,
  });

  return {
    firstResponseDueAt,
    resolutionDueAt,
    is24x7: tier.is24x7,
    tier,
  };
}

/**
 * Tạm dừng SLA (khi chờ Shop phản hồi WAITING_USER hoặc WAITING_SELLER)
 */
function pauseSla(ticket, now = new Date()) {
  if (!ticket.sla) {
    ticket.sla = {};
  }
  const nowDate = now instanceof Date ? now : new Date(now);
  ticket.sla.pauseStartedAt = nowDate;
  return ticket;
}

/**
 * Tiếp tục tính SLA và dời hạn chót tương ứng với khoảng thời gian đã tạm dừng
 */
function resumeSla(ticket, now = new Date()) {
  if (!ticket.sla || !ticket.sla.pauseStartedAt) {
    return ticket;
  }

  const pauseStart = new Date(ticket.sla.pauseStartedAt).getTime();
  const currentNow = (now instanceof Date ? now : new Date(now)).getTime();
  const pausedDurationMs = Math.max(0, currentNow - pauseStart);

  ticket.sla.pausedMs = (ticket.sla.pausedMs || 0) + pausedDurationMs;

  // Dời firstResponseDueAt nếu chưa tới hạn trước khi tạm dừng
  if (ticket.sla.firstResponseDueAt) {
    const origDue = new Date(ticket.sla.firstResponseDueAt).getTime();
    if (origDue > pauseStart) {
      ticket.sla.firstResponseDueAt = new Date(origDue + pausedDurationMs);
    }
  }

  // Dời resolutionDueAt nếu chưa tới hạn trước khi tạm dừng
  if (ticket.sla.resolutionDueAt) {
    const origDue = new Date(ticket.sla.resolutionDueAt).getTime();
    if (origDue > pauseStart) {
      ticket.sla.resolutionDueAt = new Date(origDue + pausedDurationMs);
    }
  }

  ticket.sla.pauseStartedAt = null;
  return ticket;
}

module.exports = {
  TIMEZONE,
  BUSINESS_HOURS,
  SLA_TIERS,
  normalizeHolidaySet,
  isHoliday,
  addBusinessMinutes,
  computeDueDates,
  pauseSla,
  resumeSla,
};
