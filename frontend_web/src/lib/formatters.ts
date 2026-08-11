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
