const { maskPhone, maskAddress, maskName } = require('../../src/utils/piiMask');

describe('PII Masking Utilities', () => {
  describe('maskPhone', () => {
    it('masks phone keeping 2 start and 3 end digits', () => {
      expect(maskPhone('0912345678')).toBe('09****678');
      expect(maskPhone('08499912345')).toBe('08****345');
    });

    it('handles short or invalid inputs', () => {
      expect(maskPhone('')).toBe('***');
      expect(maskPhone(null)).toBe('***');
      expect(maskPhone('123')).toBe('***');
    });
  });

  describe('maskAddress', () => {
    it('masks street and house number, keeping district/city', () => {
      const addr = '123 Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh';
      expect(maskAddress(addr)).toBe('***, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh');
    });

    it('masks short 2-part address', () => {
      const addr = '123 Lê Lợi, Quận 1';
      expect(maskAddress(addr)).toBe('***, Quận 1');
    });

    it('handles unstructured address without commas', () => {
      expect(maskAddress('Số 10 Hai Bà Trưng Hà Nội')).toBe('*** Trưng Hà Nội');
      expect(maskAddress(null)).toBe('***');
    });
  });

  describe('maskName', () => {
    it('masks name keeping family name and initial', () => {
      expect(maskName('Nguyễn Văn An')).toBe('Nguyễn V***');
      expect(maskName('Trần Bình')).toBe('Trần B***');
    });

    it('handles single word name or invalid input', () => {
      expect(maskName('John')).toBe('J***');
      expect(maskName('')).toBe('***');
      expect(maskName(null)).toBe('***');
    });
  });
});
