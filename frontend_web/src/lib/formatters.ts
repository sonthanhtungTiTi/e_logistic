export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

export function calculateChargeableWeight(
  weightKg: number,
  lengthCm: number,
  widthCm: number,
  heightCm: number
): { dimWeightKg: number; chargeableWeightKg: number; isDimApplied: boolean } {
  const dimWeightKg = Number(((lengthCm * widthCm * heightCm) / 5000).toFixed(2));
  const chargeableWeightKg = Math.max(weightKg, dimWeightKg);
  return {
    dimWeightKg,
    chargeableWeightKg,
    isDimApplied: dimWeightKg > weightKg,
  };
}

export function formatNumberWithDots(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === '') return '';
  const numStr = String(val).replace(/\D/g, '');
  if (!numStr) return '';
  return Number(numStr).toLocaleString('vi-VN');
}

export function parseDotsToNumber(str: string | undefined | null): number {
  if (!str) return 0;
  const clean = String(str).replace(/\D/g, '');
  return clean ? parseInt(clean, 10) : 0;
}
