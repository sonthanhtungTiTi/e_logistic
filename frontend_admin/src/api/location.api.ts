import axios from 'axios';

export interface Province {
  code: number;
  name: string;
  codename: string;
  division_type: string;
  phone_code: number;
}

export interface District {
  code: number;
  name: string;
  codename: string;
  division_type: string;
  province_code: number;
}

export interface Ward {
  code: number;
  name: string;
  codename: string;
  division_type: string;
  district_code: number;
}

const PRIMARY_URL = 'https://provinces.open-api.vn/api/v1';
const SECONDARY_URL = 'https://provinces.open-api.vn/api';

// In-memory cache for ultra-fast UX
const cache = {
  provinces: null as Province[] | null,
  districts: {} as Record<number, District[]>,
  wards: {} as Record<number, Ward[]>,
};

export const locationApi = {
  getProvinces: async (): Promise<Province[]> => {
    if (cache.provinces && cache.provinces.length > 0) {
      return cache.provinces;
    }
    try {
      const res = await axios.get<Province[]>(`${PRIMARY_URL}/`);
      cache.provinces = res.data;
      return res.data;
    } catch (err) {
      try {
        const res2 = await axios.get<Province[]>(`${SECONDARY_URL}/`);
        cache.provinces = res2.data;
        return res2.data;
      } catch (err2) {
        console.error('Error fetching Vietnam provinces:', err2);
        return [];
      }
    }
  },

  getDistrictsByProvince: async (provinceCode: number): Promise<District[]> => {
    if (!provinceCode) return [];
    if (cache.districts[provinceCode]) {
      return cache.districts[provinceCode];
    }
    try {
      const res = await axios.get<{ districts: District[] }>(`${PRIMARY_URL}/p/${provinceCode}?depth=2`);
      const districts = res.data.districts || [];
      cache.districts[provinceCode] = districts;
      return districts;
    } catch (err) {
      try {
        const res2 = await axios.get<{ districts: District[] }>(`${SECONDARY_URL}/p/${provinceCode}?depth=2`);
        const districts = res2.data.districts || [];
        cache.districts[provinceCode] = districts;
        return districts;
      } catch (err2) {
        console.error(`Error fetching districts for province ${provinceCode}:`, err2);
        return [];
      }
    }
  },

  getWardsByDistrict: async (districtCode: number): Promise<Ward[]> => {
    if (!districtCode) return [];
    if (cache.wards[districtCode]) {
      return cache.wards[districtCode];
    }
    try {
      const res = await axios.get<{ wards: Ward[] }>(`${PRIMARY_URL}/d/${districtCode}?depth=2`);
      const wards = res.data.wards || [];
      cache.wards[districtCode] = wards;
      return wards;
    } catch (err) {
      try {
        const res2 = await axios.get<{ wards: Ward[] }>(`${SECONDARY_URL}/d/${districtCode}?depth=2`);
        const wards = res2.data.wards || [];
        cache.wards[districtCode] = wards;
        return wards;
      } catch (err2) {
        console.error(`Error fetching wards for district ${districtCode}:`, err2);
        return [];
      }
    }
  },
};
