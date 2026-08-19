/**
 * UC-Routing: Hub-and-Spoke 3-Tier Regional Master Routing Service
 * Mô hình 3 Kho Tổng (Hà Nội, Đà Nẵng, TP.HCM) & Bưu cục Vệ tinh
 * Tích hợp Phân vùng Cước 4 Cấp (Zone-based Pricing) & Tính Khoảng cách GPS Haversine + ETA
 */

const Hub = require('../models/hub.model');
const HubCoverage = require('../models/hubCoverage.model');
const HubConnection = require('../models/hubConnection.model');

// Tọa độ GPS chuẩn của các Hub chính
const HUB_COORDINATES = {
  'HUB_HAN_01': { lat: 21.0285, lng: 105.8542, name: 'Hà Nội' },
  'HUB_DAD_01': { lat: 16.0544, lng: 108.2022, name: 'Đà Nẵng' },
  'HUB_SGN_01': { lat: 10.7769, lng: 106.7009, name: 'TP.HCM' },
  'HUB_SGN_02': { lat: 10.7769, lng: 106.7009, name: 'TP.HCM Chi nhánh 2' },
  'HUB_HPH_01': { lat: 20.8449, lng: 106.6881, name: 'Hải Phòng' },
  'HUB_VCA_01': { lat: 10.0452, lng: 105.7469, name: 'Cần Thơ' },
  'HUB_BDG_01': { lat: 10.9805, lng: 106.6519, name: 'Bình Dương' },
  'HUB_DNI_01': { lat: 10.9574, lng: 106.8427, name: 'Đồng Nai' },
  'HUB_PROVINCIAL_DEFAULT': { lat: 21.0285, lng: 105.8542, name: 'Kho Tỉnh Tạm' },
};

// 3 Kho Tổng đại diện 3 Miền
const MASTER_HUBS = {
  NORTH:   { code: 'HUB_HAN_01', name: 'Bưu cục Trung tâm Hà Nội', region: 'NORTH' },
  CENTRAL: { code: 'HUB_DAD_01', name: 'Bưu cục Đà Nẵng', region: 'CENTRAL' },
  SOUTH:   { code: 'HUB_SGN_01', name: 'Bưu cục Trung tâm TP.HCM', region: 'SOUTH' },
};

// Các Bưu cục Vệ tinh trực thuộc từng Miền
const SUB_HUBS = {
  // Miền Bắc
  'HẢI PHÒNG':   { code: 'HUB_HPH_01', name: 'Bưu cục Hải Phòng', masterCode: 'HUB_HAN_01', region: 'NORTH' },
  
  // Miền Nam
  'CẦN THƠ':     { code: 'HUB_VCA_01', name: 'Bưu cục Cần Thơ', masterCode: 'HUB_SGN_01', region: 'SOUTH' },
  'BÌNH DƯƠNG':  { code: 'HUB_BDG_01', name: 'Bưu cục Bình Dương', masterCode: 'HUB_SGN_01', region: 'SOUTH' },
  'ĐỒNG NAI':    { code: 'HUB_DNI_01', name: 'Bưu cục Đồng Nai', masterCode: 'HUB_SGN_01', region: 'SOUTH' },
};

// Danh mục 63 Tỉnh/Thành Việt Nam phân chia theo 3 Miền
const REGIONAL_PROVINCES = {
  NORTH: [
    'HÀ NỘI', 'HẢI PHÒNG', 'QUẢNG NINH', 'BẮC NINH', 'BẮC GIANG', 'HẢI DƯƠNG', 'HƯNG YÊN',
    'THÁI BÌNH', 'NAM ĐỊNH', 'NINH BÌNH', 'HÀ NAM', 'VĨNH PHÚC', 'PHÚ THỌ', 'THÁI NGUYÊN',
    'LẠNG SƠN', 'TUYÊN QUANG', 'HÀ GIANG', 'CAO BẰNG', 'BẮC KẠN', 'YÊN BÁI', 'LÀO CAI',
    'ĐIỆN BIÊN', 'LAI CHÂU', 'SƠN LA', 'HÒA BÌNH'
  ],
  CENTRAL: [
    'ĐÀ NẴNG', 'THỪA THIÊN HUẾ', 'HUẾ', 'QUẢNG NAM', 'QUẢNG NGÃI', 'BÌNH ĐỊNH', 'PHÚ YÊN',
    'KHÁNH HÒA', 'NINH THUẬN', 'BÌNH THUẬN', 'QUẢNG TRỊ', 'QUẢNG BÌNH', 'HÀ TĨNH', 'NGHỆ AN',
    'THANH HÓA', 'KON TUM', 'GIA LAI', 'ĐẮK LẮK', 'ĐẮK NÔNG', 'LÂM ĐỒNG'
  ],
  SOUTH: [
    'TP. HỒ CHÍ MINH', 'HỒ CHÍ MINH', 'TP.HCM', 'TPHCM', 'SÀI GÒN', 'BÌNH DƯƠNG', 'ĐỒNG NAI',
    'BÀ RỊA - VŨNG TÀU', 'VŨNG TÀU', 'TÂY NINH', 'LONG AN', 'TIỀN GIANG', 'BẾN TRE', 'TRÀ VINH',
    'VĨNH LONG', 'ĐỒNG THÁP', 'AN GIANG', 'KIÊN GIANG', 'CẦN THƠ', 'HẬU GIANG', 'SÓC TRĂNG',
    'BẠC LIÊU', 'CÀ MAU', 'BÌNH PHƯỚC'
  ]
};

// Hub to Master Hub mapping
const HUB_MASTER_MAP = {
  'HUB_HAN_01': 'HUB_HAN_01',
  'HUB_HPH_01': 'HUB_HAN_01',
  'HUB_DAD_01': 'HUB_DAD_01',
  'HUB_SGN_01': 'HUB_SGN_01',
  'HUB_SGN_02': 'HUB_SGN_01',
  'HUB_BDG_01': 'HUB_SGN_01',
  'HUB_DNI_01': 'HUB_SGN_01',
  'HUB_VCA_01': 'HUB_SGN_01',
};

/**
 * Chuẩn hóa chuỗi Tỉnh/Thành phố
 */
function normalizeProvince(str = '') {
  if (!str) return '';
  return str
    .toString()
    .trim()
    .toUpperCase()
    .replace(/^(TỈNH|THÀNH PHỐ|TP\.?)\s+/i, '')
    .trim();
}

/**
 * Phân giải Tỉnh/Thành sang Hub Code
 * @param {string} provinceStr
 * @returns {{ isSupported: boolean, hubCode: string, hubName: string, region: string, isMaster: boolean, masterHubCode: string }}
 */
function resolveHubRouting(provinceStr) {
  if (!provinceStr) {
    return {
      isSupported: true,
      hubCode: 'HUB_PROVINCIAL_DEFAULT',
      hubName: 'Kho Tỉnh/Thành Tạm Thời',
      region: 'UNKNOWN',
      isMaster: false,
      masterHubCode: 'HUB_HAN_01',
      needsManualRouting: true,
    };
  }

  const cleanProv = normalizeProvince(provinceStr);

  // 1. Kiểm tra Bưu cục vệ tinh trực tiếp (Hải Phòng, Cần Thơ, Bình Dương, Đồng Nai)
  for (const [key, hubInfo] of Object.entries(SUB_HUBS)) {
    if (cleanProv === key || cleanProv.includes(key) || key.includes(cleanProv)) {
      return {
        isSupported: true,
        hubCode: hubInfo.code,
        hubName: hubInfo.name,
        region: hubInfo.region,
        isMaster: false,
        masterHubCode: hubInfo.masterCode,
        needsManualRouting: false,
      };
    }
  }

  // 2. Tìm theo Miền Bắc
  for (const p of REGIONAL_PROVINCES.NORTH) {
    if (cleanProv === p || cleanProv.includes(p) || p.includes(cleanProv)) {
      return {
        isSupported: true,
        hubCode: MASTER_HUBS.NORTH.code,
        hubName: MASTER_HUBS.NORTH.name,
        region: 'NORTH',
        isMaster: true,
        masterHubCode: MASTER_HUBS.NORTH.code,
        needsManualRouting: false,
      };
    }
  }

  // 3. Tìm theo Miền Trung
  for (const p of REGIONAL_PROVINCES.CENTRAL) {
    if (cleanProv === p || cleanProv.includes(p) || p.includes(cleanProv)) {
      return {
        isSupported: true,
        hubCode: MASTER_HUBS.CENTRAL.code,
        hubName: MASTER_HUBS.CENTRAL.name,
        region: 'CENTRAL',
        isMaster: true,
        masterHubCode: MASTER_HUBS.CENTRAL.code,
        needsManualRouting: false,
      };
    }
  }

  // 4. Tìm theo Miền Nam
  for (const p of REGIONAL_PROVINCES.SOUTH) {
    if (cleanProv === p || cleanProv.includes(p) || p.includes(cleanProv)) {
      return {
        isSupported: true,
        hubCode: MASTER_HUBS.SOUTH.code,
        hubName: MASTER_HUBS.SOUTH.name,
        region: 'SOUTH',
        isMaster: true,
        masterHubCode: MASTER_HUBS.SOUTH.code,
        needsManualRouting: false,
      };
    }
  }

  // Fallback mặc định
  return {
    isSupported: true,
    hubCode: 'HUB_PROVINCIAL_DEFAULT',
    hubName: 'Kho Tỉnh/Thành Tạm Thời',
    region: 'UNKNOWN',
    isMaster: false,
    masterHubCode: 'HUB_HAN_01',
    needsManualRouting: true,
  };
}

/**
 * Phân loại Vùng Cước (Zone Tier: INTRA_PROVINCE, INTRA_REGION, NEAR_REGION, INTER_REGION)
 * @param {string} pickupProvince 
 * @param {string} deliveryProvince 
 */
function calculateZoneTier(pickupProvince, deliveryProvince) {
  const normPickup = normalizeProvince(pickupProvince);
  const normDeliv  = normalizeProvince(deliveryProvince);

  const pickupRouting = resolveHubRouting(pickupProvince);
  const delivRouting  = resolveHubRouting(deliveryProvince);

  // 1. Cùng tỉnh thành
  if (normPickup && normDeliv && normPickup === normDeliv) {
    return {
      tier: 'INTRA_PROVINCE',
      tierName: 'Nội tỉnh / Thành phố',
      originRegion: pickupRouting.region,
      destRegion: delivRouting.region,
      originHubCode: pickupRouting.hubCode,
      destHubCode: delivRouting.hubCode,
    };
  }

  const pReg = pickupRouting.region;
  const dReg = delivRouting.region;

  // 2. Cùng miền
  if (pReg === dReg && pReg !== 'UNKNOWN') {
    return {
      tier: 'INTRA_REGION',
      tierName: 'Nội miền',
      originRegion: pReg,
      destRegion: dReg,
      originHubCode: pickupRouting.hubCode,
      destHubCode: delivRouting.hubCode,
    };
  }

  // 3. Cận miền (Bắc <-> Trung hoặc Trung <-> Nam)
  const isNear = (pReg === 'NORTH' && dReg === 'CENTRAL') ||
                 (pReg === 'CENTRAL' && dReg === 'NORTH') ||
                 (pReg === 'CENTRAL' && dReg === 'SOUTH') ||
                 (pReg === 'SOUTH' && dReg === 'CENTRAL');

  if (isNear) {
    return {
      tier: 'NEAR_REGION',
      tierName: 'Cận miền (Bắc - Trung / Trung - Nam)',
      originRegion: pReg,
      destRegion: dReg,
      originHubCode: pickupRouting.hubCode,
      destHubCode: delivRouting.hubCode,
    };
  }

  // 4. Liên miền (Bắc <-> Nam)
  return {
    tier: 'INTER_REGION',
    tierName: 'Liên miền (Bắc - Nam)',
    originRegion: pReg,
    destRegion: dReg,
    originHubCode: pickupRouting.hubCode,
    destHubCode: delivRouting.hubCode,
  };
}

/**
 * Tính khoảng cách đường thẳng GPS giữa 2 điểm (Công thức Haversine)
 * @returns {number} Khoảng cách tính bằng Km
 */
function calculateHaversineKm(lat1, lon1, lat2, lon2) {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) {
    return 0;
  }
  const R = 6371; // Bán kính Trái Đất (km)
  const toRad = deg => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const straightKm = R * c;
  // Hệ số địa hình đường bộ Việt Nam ~ 1.25x khoảng cách đường chim bay
  return Math.round(straightKm * 1.25);
}

/**
 * Tính toán Lộ trình Hub-and-Spoke qua các Kho Tổng
 * @param {string} originHubCode - Hub gửi
 * @param {string} destHubCode   - Hub nhận
 * @returns {string[]} Danh sách các Hub Code theo thứ tự luân chuyển
 */
function calculateRoutePath(originHubCode, destHubCode) {
  const orig = (originHubCode || '').toUpperCase().trim();
  const dest = (destHubCode || '').toUpperCase().trim();

  if (!orig || !dest || orig === dest) {
    return [dest || orig];
  }

  const origMaster = HUB_MASTER_MAP[orig] || orig;
  const destMaster = HUB_MASTER_MAP[dest] || dest;

  const path = [];

  // 1. Kho gốc
  path.push(orig);

  // 2. Nếu Kho gốc không phải Kho Tổng -> Chuyển lên Kho Tổng vùng gốc
  if (orig !== origMaster) {
    path.push(origMaster);
  }

  // 3. Nếu Kho Tổng vùng gốc khác Kho Tổng vùng đích -> Đường trục Linehaul
  if (origMaster !== destMaster) {
    path.push(destMaster);
  }

  // 4. Nếu Kho đích là Bưu cục Vệ tinh -> Chuyển từ Kho Tổng xuống Bưu cục đích
  if (dest !== destMaster && !path.includes(dest)) {
    path.push(dest);
  }

  // Loại bỏ các phần tử trùng lặp liên tiếp nếu có
  return path.filter((code, idx) => idx === 0 || code !== path[idx - 1]);
}

/**
 * Tính toán tổng khoảng cách thực tế và thời gian dự kiến (ETA) theo mạng lưới Hub
 * @param {string} originHubCode 
 * @param {string} destHubCode 
 */
function calculateRouteDistanceAndEta(originHubCode, destHubCode) {
  const path = calculateRoutePath(originHubCode, destHubCode);

  let totalKm = 0;
  const hops = [];

  for (let i = 0; i < path.length - 1; i++) {
    const fromCode = path[i];
    const toCode   = path[i + 1];

    const fromCoords = HUB_COORDINATES[fromCode] || { lat: 21.0285, lng: 105.8542 };
    const toCoords   = HUB_COORDINATES[toCode]   || { lat: 10.7769, lng: 106.7009 };

    const hopKm = calculateHaversineKm(fromCoords.lat, fromCoords.lng, toCoords.lat, toCoords.lng);
    // Vận tốc trung bình xe tải liên tỉnh ~ 50 km/h
    const transitHours = Math.max(1, +(hopKm / 50).toFixed(1));

    hops.push({
      fromHub: fromCode,
      toHub: toCode,
      distanceKm: hopKm,
      transitHours,
    });
    totalKm += hopKm;
  }

  // Đơn nội hạt cùng Hub
  if (path.length === 1) {
    totalKm = 15; // Ước lượng 15 km nội thành
  }

  // Thời gian xử lý phân loại tại mỗi kho trung gian: 2 giờ
  const intermediateHubsCount = Math.max(0, path.length - 2);
  const sortingHours = intermediateHubsCount * 2;

  // Thời gian phát hàng chặng cuối: 4 giờ
  const deliveryBufferHours = 4;

  const totalTransitHours = hops.reduce((sum, h) => sum + h.transitHours, 0);
  const totalEtaHours = Math.round(totalTransitHours + sortingHours + deliveryBufferHours);

  // Quy đổi ra ngày (làm tròn lên)
  const estimatedDeliveryDays = Math.max(1, Math.ceil(totalEtaHours / 24));

  return {
    routePath: path,
    hops,
    totalDistanceKm: totalKm,
    totalEtaHours,
    estimatedDeliveryDays,
    intermediateHubsCount,
  };
}

/**
 * Xác định Hub kế tiếp cần chuyển đến
 * @param {string} currentHubCode 
 * @param {string} destHubCode 
 * @param {string} [originHubCode] 
 * @returns {string|null} Hub Code kế tiếp, hoặc null nếu đã đến đích
 */
function getNextHopHub(currentHubCode, destHubCode, originHubCode = null) {
  const curr = (currentHubCode || '').toUpperCase().trim();
  const dest = (destHubCode || '').toUpperCase().trim();

  if (curr === dest) return null; // Đã đến đích

  const path = calculateRoutePath(originHubCode || curr, dest);
  const currIdx = path.indexOf(curr);

  if (currIdx >= 0 && currIdx < path.length - 1) {
    return path[currIdx + 1];
  }

  // Fallback: nếu không tìm thấy current trong path, trả về Kho Tổng đích hoặc chính dest
  const destMaster = HUB_MASTER_MAP[dest] || dest;
  return curr === destMaster ? dest : destMaster;
}

/**
 * Tìm hub phụ trách 1 địa chỉ cụ thể theo HubCoverage DB hoặc fallback theo resolveHubRouting.
 */
async function findHubByAddress(province, district) {
  if (!province) {
    throw new Error('Thiếu thông tin Tỉnh/Thành phố khi tìm Hub phụ trách.');
  }

  // 1. Tìm trong HubCoverage DB
  let coverage = null;
  if (district) {
    coverage = await HubCoverage.findOne({ province, district }).populate('hubId');
  }

  if (!coverage) {
    const cleanProv = (province || '').replace(/^(Tỉnh|Thành phố|TP\.?)\s+/i, '').trim();
    coverage = await HubCoverage.findOne({
      province: new RegExp(cleanProv, 'i'),
      ...(district ? { district: new RegExp(district.trim(), 'i') } : {})
    }).populate('hubId');
  }

  if (coverage && coverage.hubId) {
    return coverage.hubId;
  }

  // 2. Fallback nếu chưa cấu hình HubCoverage DB: tìm hoặc tạo Hub theo resolveHubRouting
  const legacyRouting = resolveHubRouting(province);
  let fallbackHub = await Hub.findOne({ code: legacyRouting.hubCode });
  if (!fallbackHub) {
    fallbackHub = await Hub.create({
      code: legacyRouting.hubCode,
      name: legacyRouting.hubName,
      type: legacyRouting.isMaster ? 'SORTING' : 'HYBRID',
      province: province,
      district: district || '',
    });
  }
  return fallbackHub;
}

/**
 * Dijkstra tìm đường đi ngắn nhất giữa 2 Hub dựa trên transitTimeHours.
 */
async function findShortestHubPath(fromHubId, toHubId) {
  const fromId = fromHubId.toString();
  const toId = toHubId.toString();

  if (fromId === toId) {
    return [fromId];
  }

  const allConnections = await HubConnection.find({ isActive: true }).lean();

  const graph = {};
  for (const conn of allConnections) {
    const from = conn.fromHubId.toString();
    const to = conn.toHubId.toString();
    if (!graph[from]) graph[from] = [];
    graph[from].push({ to, weight: conn.transitTimeHours });
  }

  const distances = { [fromId]: 0 };
  const previous = {};
  const visited = new Set();
  const queue = new Set([fromId]);

  while (queue.size > 0) {
    let current = null;
    let currentDist = Infinity;
    for (const node of queue) {
      if ((distances[node] ?? Infinity) < currentDist) {
        currentDist = distances[node];
        current = node;
      }
    }
    if (current === null) break;
    queue.delete(current);
    visited.add(current);

    if (current === toId) break;

    const neighbors = graph[current] || [];
    for (const { to, weight } of neighbors) {
      if (visited.has(to)) continue;
      const newDist = distances[current] + weight;
      if (newDist < (distances[to] ?? Infinity)) {
        distances[to] = newDist;
        previous[to] = current;
        queue.add(to);
      }
    }
  }

  if (!(toId in distances)) {
    return null;
  }

  const path = [];
  let node = toId;
  while (node !== undefined) {
    path.unshift(node);
    node = previous[node];
  }
  return path;
}

/**
 * Hàm chính: từ địa chỉ pickup + delivery -> trả về routeNodes hoàn chỉnh.
 */
async function resolveOrderRoute(pickupAddress, deliveryAddress) {
  const pickupHub = await findHubByAddress(pickupAddress.province, pickupAddress.district);
  const deliveryHub = await findHubByAddress(deliveryAddress.province, deliveryAddress.district);

  const path = await findShortestHubPath(pickupHub._id, deliveryHub._id);
  if (!path || path.length === 0) {
    const fallbackPath = pickupHub._id.equals(deliveryHub._id)
      ? [pickupHub._id.toString()]
      : [pickupHub._id.toString(), deliveryHub._id.toString()];

    return fallbackPath.map((hubId, index) => ({
      hubId,
      hubType: index === 0 ? 'PICKUP' : (index === fallbackPath.length - 1 ? 'DELIVERY' : 'SORTING'),
      sequenceIndex: index,
      status: 'PENDING'
    }));
  }

  return path.map((hubId, index) => ({
    hubId,
    hubType: index === 0 ? 'PICKUP' : (index === path.length - 1 ? 'DELIVERY' : 'SORTING'),
    sequenceIndex: index,
    status: 'PENDING'
  }));
}

module.exports = {
  HUB_COORDINATES,
  MASTER_HUBS,
  SUB_HUBS,
  REGIONAL_PROVINCES,
  HUB_MASTER_MAP,
  normalizeProvince,
  resolveHubRouting,
  calculateZoneTier,
  calculateHaversineKm,
  calculateRoutePath,
  calculateRouteDistanceAndEta,
  getNextHopHub,
  findHubByAddress,
  findShortestHubPath,
  resolveOrderRoute,
};
