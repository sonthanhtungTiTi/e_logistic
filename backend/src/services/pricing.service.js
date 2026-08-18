/**
 * Pricing & Risk Engine Service for E-Logistics (UC-06 & UC-07)
 */

// Shared Volumetric Divisor (Standard: 5000)
const VOLUMETRIC_DIVISOR = 5000;

// Simulated Master Data Hubs mapping (Supported Provinces & Hubs)
const MASTER_HUB_MAP = {
  'HÀ NỘI': { hubCode: 'HUB_HAN_01', hubName: 'Bưu cục Trung tâm Hà Nội', isSupported: true },
  'TP. HỒ CHÍ MINH': { hubCode: 'HUB_SGN_01', hubName: 'Bưu cục Trung tâm TP.HCM', isSupported: true },
  'ĐÀ NẴNG': { hubCode: 'HUB_DAD_01', hubName: 'Bưu cục Đà Nẵng', isSupported: true },
  'CẦN THƠ': { hubCode: 'HUB_VCA_01', hubName: 'Bưu cục Cần Thơ', isSupported: true },
  'BÌNH ĐƯƠNG': { hubCode: 'HUB_BDG_01', hubName: 'Bưu cục Bình Dương', isSupported: true },
  'ĐỒNG NAI': { hubCode: 'HUB_DNI_01', hubName: 'Bưu cục Đồng Nai', isSupported: true },
  'HẢI PHÒNG': { hubCode: 'HUB_HPH_01', hubName: 'Bưu cục Hải Phòng', isSupported: true },
};

// Valid Discount Codes
const DISCOUNT_CODES = {
  'FREESHIP15': { discountType: 'FIXED', value: 15000, active: true },
  'ELOG50': { discountType: 'PERCENT', value: 0.5, maxDiscount: 50000, active: true },
  'WELCOME10': { discountType: 'FIXED', value: 10000, active: true },
  'EXPIRED2025': { discountType: 'FIXED', value: 20000, active: false }
};

/**
 * Calculates Chargeable Weight in Kg
 * Rule: Volumetric Weight = (D * R * C) / VOLUMETRIC_DIVISOR (kg)
 * Chargeable Weight = max(actualWeight, volumetricWeight) rounded UP to nearest 0.5 kg
 */
const calculateChargeableWeight = (actualWeightKg = 0, dimensions) => {
  const safeActualWeight = Number(actualWeightKg) || 0;
  let volumetricWeight = 0;
  if (dimensions && dimensions.length > 0 && dimensions.width > 0 && dimensions.height > 0) {
    volumetricWeight = (dimensions.length * dimensions.width * dimensions.height) / VOLUMETRIC_DIVISOR;
  }
  
  const rawMaxWeight = Math.max(safeActualWeight, volumetricWeight);
  // Math.ceil(weight * 2) / 2 rounds up to nearest 0.5 kg (e.g. 1.2 -> 1.5, 1.6 -> 2.0)
  const chargeableWeight = Math.ceil(rawMaxWeight * 2) / 2;

  return {
    actualWeight: Number(safeActualWeight.toFixed(2)),
    volumetricWeight: Number((volumetricWeight || 0).toFixed(2)),
    chargeableWeight: Number((chargeableWeight || 0).toFixed(1))
  };
};

const hubRoutingService = require('./hubRouting.service');

/**
 * Service Area & Hub Routing Lookup
 */
const resolveHubRouting = (province) => {
  if (!province) {
    return { isSupported: false, hubCode: null, needsManualRouting: true };
  }
  return hubRoutingService.resolveHubRouting(province);
};

/**
 * Calculates Full Order Fees (Base Shipping + Valuation/Insurance - Discount)
 */
const calculateOrderFees = ({ actualWeight, dimensions, pickupAddress, deliveryAddress, goodsValue = 0, discountCode }) => {
  // 1. Calculate Weights
  const { actualWeight: actW, volumetricWeight: volW, chargeableWeight: chgW } = calculateChargeableWeight(actualWeight, dimensions);

  // 2. Hub Routing Check
  const pickupRouting = resolveHubRouting(pickupAddress?.province);
  const deliveryRouting = resolveHubRouting(deliveryAddress?.province);

  if (!pickupRouting.isSupported || !deliveryRouting.isSupported) {
    const error = new Error('Địa chỉ không thuộc phạm vi phục vụ của hệ thống');
    error.statusCode = 422; // 422 Unprocessable Entity for business/pricing address failure
    error.code = 'OUTSIDE_SERVICE_AREA';
    throw error;
  }

  const needsManualRouting = pickupRouting.needsManualRouting || deliveryRouting.needsManualRouting || false;

  // 3. Zone-Based Pricing & Route Distance/ETA
  const zoneInfo = hubRoutingService.calculateZoneTier(pickupAddress?.province, deliveryAddress?.province);
  const routeMetrics = hubRoutingService.calculateRouteDistanceAndEta(pickupRouting.hubCode, deliveryRouting.hubCode);

  let baseFee = 0;
  const extraWeightSteps = chgW > 1.0 ? Math.ceil((chgW - 1.0) / 0.5) : 0;

  switch (zoneInfo.tier) {
    case 'INTRA_PROVINCE':
      // Nội tỉnh: 16.500 đ (<= 1.0 kg), + 5.000 đ / 0.5 kg phụ trội
      baseFee = 16500 + extraWeightSteps * 5000;
      break;
    case 'INTRA_REGION':
      // Nội miền: 22.000 đ (<= 1.0 kg), + 6.000 đ / 0.5 kg phụ trội
      baseFee = 22000 + extraWeightSteps * 6000;
      break;
    case 'NEAR_REGION':
      // Cận miền: 28.000 đ (<= 1.0 kg), + 7.000 đ / 0.5 kg phụ trội
      baseFee = 28000 + extraWeightSteps * 7000;
      break;
    case 'INTER_REGION':
    default:
      // Liên miền (Bắc - Nam): 35.000 đ (<= 1.0 kg), + 8.500 đ / 0.5 kg phụ trội
      baseFee = 35000 + extraWeightSteps * 8500;
      break;
  }

  // 4. Insurance / Goods Valuation Fee
  // If goodsValue > 1,000,000 VND -> 0.5% insurance fee
  let insuranceFee = 0;
  const numericGoodsValue = Math.max(0, Math.floor(Number(goodsValue) || 0));
  if (numericGoodsValue > 1000000) {
    insuranceFee = Math.round(numericGoodsValue * 0.005);
  }

  // 5. Discount Code Validation & Calculation
  let discountAmount = 0;
  let discountError = null;

  if (discountCode && discountCode.trim() !== '') {
    const codeKey = discountCode.trim().toUpperCase();
    const promo = DISCOUNT_CODES[codeKey];

    if (!promo || !promo.active) {
      discountError = 'Mã khuyến mãi không hợp lệ hoặc đã hết lượt sử dụng';
    } else {
      if (promo.discountType === 'FIXED') {
        discountAmount = promo.value;
      } else if (promo.discountType === 'PERCENT') {
        discountAmount = Math.round(baseFee * promo.value);
        if (promo.maxDiscount && discountAmount > promo.maxDiscount) {
          discountAmount = promo.maxDiscount;
        }
      }
    }
  }

  const finalFee = Math.max(0, baseFee + insuranceFee - discountAmount);

  return {
    actualWeight: actW,
    volumetricWeight: volW,
    chargeableWeight: chgW,
    baseFee: Math.floor(baseFee),
    insuranceFee: Math.floor(insuranceFee),
    discountAmount: Math.floor(discountAmount),
    discountError,
    shippingFee: Math.floor(finalFee),
    pickupHub: pickupRouting.hubCode,
    deliveryHub: deliveryRouting.hubCode,
    needsManualRouting,
    // Zone & Distance/ETA Information
    zoneTier: zoneInfo.tier,
    zoneName: zoneInfo.tierName,
    routeDistanceKm: routeMetrics.totalDistanceKm,
    estimatedEtaHours: routeMetrics.totalEtaHours,
    estimatedDeliveryDays: routeMetrics.estimatedDeliveryDays,
    routePath: routeMetrics.routePath,
  };
};

/**
 * Risk Engine Logic
 * Checks shipping fee and COD amount against threshold guards
 */
const evaluateRisk = ({ shippingFee, codAmount = 0, goodsValue = 0, needsManualRouting = false }) => {
  const numericCod = Math.max(0, Math.floor(Number(codAmount) || 0));
  const numericGoods = Math.max(0, Math.floor(Number(goodsValue) || 0));

  let flagFeeWarning = false;
  let flagCodAnomaly = false;

  // Fee threshold warning (> 500,000 VND)
  if (shippingFee > 500000) {
    flagFeeWarning = true;
  }

  // COD anomaly warning (> 10,000,000 VND or COD > 2x goodsValue if goodsValue > 0)
  if (numericCod > 10000000 || (numericGoods > 0 && numericCod > numericGoods * 2)) {
    flagCodAnomaly = true;
  }

  const isRisk = flagFeeWarning || flagCodAnomaly || needsManualRouting;
  const status = isRisk ? 'PENDING_VERIFICATION' : 'CREATED';

  return {
    isRisk,
    flagFeeWarning,
    flagCodAnomaly,
    needsManualRouting,
    status
  };
};

module.exports = {
  VOLUMETRIC_DIVISOR,
  calculateChargeableWeight,
  resolveHubRouting,
  calculateOrderFees,
  calculateShippingFee: calculateOrderFees,
  evaluateRisk
};
