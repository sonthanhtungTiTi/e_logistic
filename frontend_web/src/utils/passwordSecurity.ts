export interface PasswordCriteria {
  hasMinLength: boolean;  // >= 8 ký tự
  hasUpperCase: boolean;  // Chữ hoa (A-Z)
  hasLowerCase: boolean;  // Chữ thường (a-z)
  hasNumber: boolean;     // Chữ số (0-9)
  hasSpecialChar: boolean;// Ký tự đặc biệt (!@#$%^&*)
}

export interface PasswordSecurityResult {
  score: number; // 0 -> 100%
  level: 'VERY_WEAK' | 'WEAK' | 'MEDIUM' | 'STRONG' | 'VERY_STRONG';
  label: string;
  colorClass: string;
  barColorClass: string;
  criteria: PasswordCriteria;
  isValid: boolean;
}

/**
 * Check password security strength based on OWASP standards
 */
export const checkPasswordSecurity = (password: string): PasswordSecurityResult => {
  const criteria: PasswordCriteria = {
    hasMinLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  let metCount = 0;
  if (criteria.hasMinLength) metCount++;
  if (criteria.hasUpperCase) metCount++;
  if (criteria.hasLowerCase) metCount++;
  if (criteria.hasNumber) metCount++;
  if (criteria.hasSpecialChar) metCount++;

  let score = Math.round((metCount / 5) * 100);
  if (password.length >= 12 && metCount >= 4) {
    score = 100;
  }

  if (!password) {
    return {
      score: 0,
      level: 'VERY_WEAK',
      label: 'Chưa nhập',
      colorClass: 'text-slate-500',
      barColorClass: 'bg-slate-800',
      criteria,
      isValid: false,
    };
  }

  let level: PasswordSecurityResult['level'] = 'VERY_WEAK';
  let label = 'Rất yếu (Cực kỳ không an toàn)';
  let colorClass = 'text-rose-400';
  let barColorClass = 'bg-rose-500';

  if (metCount <= 2) {
    level = 'WEAK';
    label = 'Yếu (Cần bổ sung tiêu chí)';
    colorClass = 'text-rose-400';
    barColorClass = 'bg-rose-500';
  } else if (metCount === 3) {
    level = 'MEDIUM';
    label = 'Trung bình';
    colorClass = 'text-amber-400';
    barColorClass = 'bg-amber-500';
  } else if (metCount === 4) {
    level = 'STRONG';
    label = 'Mạnh (Đạt chuẩn bảo mật)';
    colorClass = 'text-cyan-400';
    barColorClass = 'bg-cyan-500';
  } else {
    level = 'VERY_STRONG';
    label = 'Rất mạnh (Bảo mật an toàn cao)';
    colorClass = 'text-emerald-400';
    barColorClass = 'bg-emerald-500';
  }

  // Yêu cầu bắt buộc: ít nhất 8 ký tự và đạt tối thiểu 4/5 tiêu chí
  const isValid = criteria.hasMinLength && metCount >= 4;

  return {
    score,
    level,
    label,
    colorClass,
    barColorClass,
    criteria,
    isValid,
  };
};
