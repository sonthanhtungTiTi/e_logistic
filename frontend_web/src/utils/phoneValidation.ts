export interface PhoneValidationResult {
  isValid: boolean;
  carrierName: string | null;
  errorMessage: string | null;
}

const CARRIER_PREFIXES: Record<string, string[]> = {
  'Viettel': ['086', '096', '097', '098', '032', '033', '034', '035', '036', '037', '038', '039'],
  'Vinaphone': ['088', '091', '094', '083', '084', '085', '081', '082'],
  'Mobifone': ['089', '090', '093', '070', '079', '077', '076', '078'],
  'Vietnamobile': ['092', '056', '058', '052'],
  'Gmobile': ['099', '059'],
  'Wintel / Itelecom': ['087', '055'],
};

/**
 * Validate Vietnamese Mobile Phone Number with carrier detection
 */
export const validateVietnamesePhone = (phone: string): PhoneValidationResult => {
  const cleanPhone = phone.trim().replace(/\s+/g, '');

  if (!cleanPhone) {
    return { isValid: false, carrierName: null, errorMessage: 'Vui lòng nhập số điện thoại liên hệ.' };
  }

  if (!cleanPhone.startsWith('0')) {
    return { isValid: false, carrierName: null, errorMessage: 'Số điện thoại Việt Nam phải bắt đầu bằng số 0.' };
  }

  if (!/^\d+$/.test(cleanPhone)) {
    return { isValid: false, carrierName: null, errorMessage: 'Số điện thoại chỉ được chứa các chữ số từ 0-9.' };
  }

  if (cleanPhone.length !== 10) {
    return { isValid: false, carrierName: null, errorMessage: `Số điện thoại di động phải gồm đúng 10 chữ số (hiện tại: ${cleanPhone.length} số).` };
  }

  const prefix3 = cleanPhone.slice(0, 3);
  let matchedCarrier: string | null = null;

  for (const [carrier, prefixes] of Object.entries(CARRIER_PREFIXES)) {
    if (prefixes.includes(prefix3)) {
      matchedCarrier = carrier;
      break;
    }
  }

  if (!matchedCarrier) {
    return {
      isValid: false,
      carrierName: null,
      errorMessage: `Đầu số ${prefix3} không thuộc dải đầu số di động hợp lệ tại Việt Nam (Viettel, Vina, Mobi, Vietnamobile, Gmobile, Wintel).`,
    };
  }

  return {
    isValid: true,
    carrierName: matchedCarrier,
    errorMessage: null,
  };
};
