const {
  normalizePriority,
  resolvePriority,
  computePriority,
} = require('../../src/services/ticketPriority.service');

describe('resolvePriority & computePriority Unit Tests', () => {
  describe('normalizePriority', () => {
    it('chuẩn hoá đúng các giá trị legacy string và P1-P4', () => {
      expect(normalizePriority('URGENT')).toBe('P1');
      expect(normalizePriority('urgent ')).toBe('P1');
      expect(normalizePriority('HIGH')).toBe('P2');
      expect(normalizePriority('NORMAL')).toBe('P3');
      expect(normalizePriority('LOW')).toBe('P4');
      expect(normalizePriority('P1')).toBe('P1');
      expect(normalizePriority('p2')).toBe('P2');
      expect(normalizePriority('P3')).toBe('P3');
      expect(normalizePriority('P4')).toBe('P4');
      expect(normalizePriority('INVALID_STRING')).toBeNull();
      expect(normalizePriority(null)).toBeNull();
      expect(normalizePriority(undefined)).toBeNull();
      expect(normalizePriority('')).toBeNull();
    });
  });

  describe('resolvePriority', () => {
    it('Case 1: Thủ công cao hơn tự động -> lấy giá trị thủ công (URGENT > P3 => P1)', () => {
      expect(resolvePriority('URGENT', 'P3')).toBe('P1');
      expect(resolvePriority('P1', 'P4')).toBe('P1');
      expect(resolvePriority('HIGH', 'P3')).toBe('P2');
    });

    it('Case 2: Tự động cao hơn thủ công -> lấy giá trị tự động (NORMAL < P2 => P2)', () => {
      expect(resolvePriority('NORMAL', 'P2')).toBe('P2');
      expect(resolvePriority('LOW', 'P1')).toBe('P1');
      expect(resolvePriority('P4', 'P3')).toBe('P3');
    });

    it('Case 3: Thủ công và Tự động bằng nhau -> trả về đúng mức độ đó (HIGH == P2 => P2)', () => {
      expect(resolvePriority('HIGH', 'P2')).toBe('P2');
      expect(resolvePriority('P1', 'P1')).toBe('P1');
      expect(resolvePriority('NORMAL', 'P3')).toBe('P3');
      expect(resolvePriority('LOW', 'P4')).toBe('P4');
    });

    it('Case 4: Thủ công không hợp lệ hoặc rỗng -> lấy tự động', () => {
      expect(resolvePriority(null, 'P2')).toBe('P2');
      expect(resolvePriority('', 'P1')).toBe('P1');
      expect(resolvePriority('INVALID_VALUE', 'P3')).toBe('P3');
    });

    it('Case 5: Tự động không hợp lệ hoặc rỗng -> lấy thủ công', () => {
      expect(resolvePriority('HIGH', null)).toBe('P2');
      expect(resolvePriority('P1', undefined)).toBe('P1');
      expect(resolvePriority('LOW', 'BAD_AUTO')).toBe('P4');
    });

    it('Case 6: Cả hai đều không hợp lệ hoặc rỗng -> fallback về P3', () => {
      expect(resolvePriority(null, null)).toBe('P3');
      expect(resolvePriority('', '')).toBe('P3');
      expect(resolvePriority('BAD1', 'BAD2')).toBe('P3');
    });
  });

  describe('computePriority với enum đã sửa', () => {
    it('Nhánh P1: ADDRESS_CHANGE khi đơn đang đi giao (IN_TRANSIT / OUT_FOR_DELIVERY / DELIVERING) -> P1', () => {
      const p = computePriority({ category: 'ADDRESS_CHANGE' }, { status: 'IN_TRANSIT' });
      expect(p).toBe('P1');

      const pDelivering = computePriority({ category: 'ADDRESS_CHANGE' }, { status: 'DELIVERING' });
      expect(pDelivering).toBe('P1');
    });

    it('Nhánh P1: COD_DISPUTE với codAmount > 5.000.000 VNĐ -> P1', () => {
      const p = computePriority({ category: 'COD_DISPUTE' }, { codAmount: 6000000 });
      expect(p).toBe('P1');
    });

    it('Nhánh P2: DAMAGED_GOODS hoặc LOST_GOODS -> P2', () => {
      expect(computePriority({ category: 'DAMAGED_GOODS' })).toBe('P2');
      expect(computePriority({ category: 'LOST_GOODS' })).toBe('P2');
      expect(computePriority({ category: 'DAMAGED' })).toBe('P2');
    });

    it('Nhánh P3: DELIVERY_DELAY hoặc PICKUP_FAIL -> P3', () => {
      expect(computePriority({ category: 'DELIVERY_DELAY' })).toBe('P3');
      expect(computePriority({ category: 'PICKUP_FAIL' })).toBe('P3');
    });

    it('Nhánh P4: OTHER -> P4', () => {
      expect(computePriority({ category: 'OTHER' })).toBe('P4');
    });
  });
});
