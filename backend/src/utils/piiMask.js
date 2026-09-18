/**
 * PII Masking Utilities for Customer Service (Anti-IDOR & Privacy Guard)
 */

/**
 * Mask phone number: Giữ 2 số đầu, 3 số cuối, che phần giữa bằng '****'
 * Example: '0912345678' -> '09****678'
 * @param {string} phone
 * @returns {string}
 */
function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return '***';
  const clean = phone.trim();
  if (clean.length < 6) return '***';

  const prefix = clean.slice(0, 2);
  const suffix = clean.slice(-3);
  return `${prefix}****${suffix}`;
}

/**
 * Mask address: Giữ lại Quận/Huyện/Tỉnh/Thành phố, che số nhà và tên đường
 * Example: '123 Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh' -> '***, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh'
 * @param {string} address
 * @returns {string}
 */
function maskAddress(address) {
  if (!address || typeof address !== 'string') return '***';
  const clean = address.trim();
  const parts = clean.split(',').map((p) => p.trim());

  if (parts.length > 2) {
    // 3 phần trở lên: che phần đầu (số nhà, đường), giữ lại các phần sau (phường/xã, quận/huyện, tỉnh/tp)
    const preserved = parts.slice(1).join(', ');
    return `***, ${preserved}`;
  } else if (parts.length === 2) {
    return `***, ${parts[1]}`;
  }

  // Nếu không có dấu phẩy: che 60% đầu chuỗi
  const words = clean.split(/\s+/);
  if (words.length <= 2) return '***';
  const keepCount = Math.max(1, Math.floor(words.length / 2));
  const preserved = words.slice(-keepCount).join(' ');
  return `*** ${preserved}`;
}

/**
 * Mask full name: Giữ họ + ký tự đầu tên, che phần còn lại bằng ***
 * Example: 'Nguyễn Văn An' -> 'Nguyễn V***'
 * @param {string} name
 * @returns {string}
 */
function maskName(name) {
  if (!name || typeof name !== 'string') return '***';
  const clean = name.trim();
  const words = clean.split(/\s+/);

  if (words.length === 1) {
    return words[0].length > 1 ? `${words[0][0]}***` : '***';
  }

  const firstName = words[0]; // Họ
  const nextInitial = words[1][0] || '';
  return `${firstName} ${nextInitial}***`;
}

module.exports = {
  maskPhone,
  maskAddress,
  maskName,
};
