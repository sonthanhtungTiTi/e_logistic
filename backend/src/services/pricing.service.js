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
  // Input Validation
  const numWeight = Number(actualWeight);
  if (actualWeight !== undefined && (numWeight <= 0 || isNaN(numWeight))) {
    const error = new Error('Khối lượng hàng hóa (actualWeight) phải lớn hơn 0 kg');
    error.statusCode = 400;
    error.code = 'INVALID_WEIGHT';
    throw error;
  }
  if (dimensions && typeof dimensions === 'object') {
    const { length = 0, width = 0, height = 0 } = dimensions;
    if (Number(length) < 0 || Number(width) < 0 || Number(height) < 0) {
      const error = new Error('Kích thước bưu kiện (Dài x Rộng x Cao) không được âm');
      error.statusCode = 400;
      error.code = 'INVALID_DIMENSIONS';
      throw error;
    }
  }
  if (goodsValue !== undefined && Number(goodsValue) < 0) {
    const error = new Error('Giá trị khai giá hàng hóa (goodsValue) không được âm');
    error.statusCode = 400;
    error.code = 'INVALID_GOODS_VALUE';
    throw error;
  }

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

  const pricingConfigCtrl = require('../controllers/pricingConfig.controller');
  const activeConfig = pricingConfigCtrl.getSyncConfig();
  const zoneConfig = activeConfig.zones?.[zoneInfo.tier] || {
    baseFee: 35000,
    extraWeightFee: 8500,
    baseWeightKg: 1.0,
    stepKg: 0.5,
  };

  const baseWeight = zoneConfig.baseWeightKg || 1.0;
  const step = zoneConfig.stepKg || 0.5;
  const extraWeightSteps = chgW > baseWeight ? Math.ceil((chgW - baseWeight) / step) : 0;
  let baseFee = zoneConfig.baseFee + extraWeightSteps * (zoneConfig.extraWeightFee || 0);

  // 4. Insurance / Goods Valuation Fee
  let insuranceFee = 0;
  const numericGoodsValue = Math.max(0, Math.floor(Number(goodsValue) || 0));
  const insThreshold = activeConfig.insurance?.threshold || 1000000;
  const insRate = activeConfig.insurance?.rate || 0.005;
  if (numericGoodsValue > insThreshold) {
    insuranceFee = Math.round(numericGoodsValue * insRate);
  }

  // 5. Discount Code Validation & Calculation
  let discountAmount = 0;
  let discountError = null;

  if (discountCode && discountCode.trim() !== '') {
    const codeKey = discountCode.trim().toUpperCase();
    const allVouchers = pricingConfigCtrl.getSyncVouchers();
    let promo = Array.isArray(allVouchers) ? allVouchers.find((v) => v.code === codeKey) : null;
    if (!promo) {
      promo = DISCOUNT_CODES[codeKey];
    }

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

  const pricingConfigCtrl = require('../controllers/pricingConfig.controller');
  const activeConfig = pricingConfigCtrl.getSyncConfig();
  const feeLimit = activeConfig.riskThresholds?.feeWarning || 500000;
  const codLimit = activeConfig.riskThresholds?.codWarning || 10000000;

  let flagFeeWarning = false;
  let flagCodAnomaly = false;

  // Fee threshold warning (> 500,000 VND hoặc cấu hình)
  if (shippingFee > feeLimit) {
    flagFeeWarning = true;
  }

  // COD anomaly warning (> 10,000,000 VND hoặc COD > 2x goodsValue if goodsValue > 0)
  if (numericCod > codLimit || (numericGoods > 0 && numericCod > numericGoods * 2)) {
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
