import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { locationApi } from '../../api/location.api';
import type { Province, District, Ward } from '../../api/location.api';

export interface VietnamAddressData {
  province: string;
  district: string;
  ward: string;
  address: string;
  note?: string;
}

interface VietnamAddressSelectorProps {
  value: VietnamAddressData;
  onChange: (data: VietnamAddressData) => void;
  disabled?: boolean;
  showNoteField?: boolean;
  layout?: 'grid' | 'stacked';
  darkTheme?: boolean;
}

// Utility to match administrative location strings (e.g. "Hồ Chí Minh", "Quận 5", "Phường 1")
const matchLocationItem = (list: { code: number; name: string; codename?: string }[], val: string) => {
  if (!val || !list || list.length === 0) return null;
  const cleanVal = val.toLowerCase().trim();
  
  // 1. Exact match
  let matched = list.find((item) => item.name.toLowerCase().trim() === cleanVal);
  if (matched) return matched;

  // 2. Codename match
  matched = list.find((item) => item.codename && item.codename.includes(cleanVal));
  if (matched) return matched;

  // 3. Prefix stripped match (Tỉnh, Thành phố, Quận, Huyện, Phường, Xã)
  const stripPrefix = (str: string) =>
    str.replace(/^(tỉnh|thành phố|tp\.|quận|q\.|huyện|h\.|thị xã|tx\.|phường|p\.|xã)\s*/gi, '').trim();

  const strippedVal = stripPrefix(cleanVal);
  matched = list.find((item) => {
    const strippedName = stripPrefix(item.name.toLowerCase());
    return strippedName === strippedVal;
  });
  if (matched) return matched;

  // 4. Substring inclusion match
  return list.find((item) => {
    const lowerName = item.name.toLowerCase();
    return lowerName.includes(cleanVal) || cleanVal.includes(lowerName);
  }) || null;
};

export const VietnamAddressSelector: React.FC<VietnamAddressSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  showNoteField = true,
  layout = 'grid',
  darkTheme = true,
}) => {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);

  const [selectedProvinceCode, setSelectedProvinceCode] = useState<number | ''>('');
  const [selectedDistrictCode, setSelectedDistrictCode] = useState<number | ''>('');

  const [loadingProvinces, setLoadingProvinces] = useState<boolean>(false);
  const [loadingDistricts, setLoadingDistricts] = useState<boolean>(false);
  const [loadingWards, setLoadingWards] = useState<boolean>(false);

  // Load Provinces on Mount from Open API
  useEffect(() => {
    let isMounted = true;
    const fetchProvinces = async () => {
      setLoadingProvinces(true);
      const data = await locationApi.getProvinces();
      if (isMounted) {
        setProvinces(data);
        setLoadingProvinces(false);

        // Match initial province if provided
        if (value.province) {
          const matchedP = matchLocationItem(data, value.province);
          if (matchedP) {
            setSelectedProvinceCode(matchedP.code);
          }
        }
      }
    };
    fetchProvinces();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch Districts when selectedProvinceCode changes
  useEffect(() => {
    let isMounted = true;
    if (!selectedProvinceCode) {
      setDistricts([]);
      setWards([]);
      setSelectedDistrictCode('');
      return;
    }

    const fetchDistricts = async () => {
      setLoadingDistricts(true);
      const data = await locationApi.getDistrictsByProvince(Number(selectedProvinceCode));
      if (isMounted) {
        setDistricts(data);
        setLoadingDistricts(false);

        // Match initial district if provided
        if (value.district) {
          const matchedD = matchLocationItem(data, value.district);
          if (matchedD) {
            setSelectedDistrictCode(matchedD.code);
          }
        }
      }
    };
    fetchDistricts();
    return () => {
      isMounted = false;
    };
  }, [selectedProvinceCode]);

  // Fetch Wards from https://provinces.open-api.vn/api/v1/d/{districtCode}?depth=2
  useEffect(() => {
    let isMounted = true;
    if (!selectedDistrictCode) {
      setWards([]);
      return;
    }

    const fetchWards = async () => {
      setLoadingWards(true);
      const data = await locationApi.getWardsByDistrict(Number(selectedDistrictCode));
      if (isMounted) {
        setWards(data);
        setLoadingWards(false);
      }
    };
    fetchWards();
    return () => {
      isMounted = false;
    };
  }, [selectedDistrictCode]);

  // Handlers
  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = Number(e.target.value) || '';
    setSelectedProvinceCode(code);
    setSelectedDistrictCode('');
    setDistricts([]);
    setWards([]);

    const selectedProv = provinces.find((p) => p.code === code);
    onChange({
      ...value,
      province: selectedProv ? selectedProv.name : '',
      district: '',
      ward: '',
    });
  };

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = Number(e.target.value) || '';
    setSelectedDistrictCode(code);
    setWards([]);

    const selectedDist = districts.find((d) => d.code === code);
    onChange({
      ...value,
      district: selectedDist ? selectedDist.name : '',
      ward: '',
    });
  };

  const handleWardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const wardName = e.target.value;
    onChange({
      ...value,
      ward: wardName,
    });
  };

  const handleStreetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...value,
      address: e.target.value,
    });
  };

  const handleNoteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...value,
      note: e.target.value,
    });
  };

  const selectStyle = darkTheme
    ? 'w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-blue-500 transition disabled:opacity-50'
    : 'w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-blue-500 transition disabled:opacity-50';

  const inputStyle = darkTheme
    ? 'w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-blue-500 transition disabled:opacity-50'
    : 'w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-blue-500 transition disabled:opacity-50';

  const labelStyle = darkTheme ? 'block text-xs font-bold text-slate-300 mb-1' : 'block text-xs font-bold text-slate-700 mb-1';

  return (
    <div className="space-y-3">
      {/* Province & District Row */}
      <div className={layout === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'space-y-3'}>
        <div>
          <label className={labelStyle}>Tỉnh / Thành Phố *</label>
          <div className="relative">
            <select
              value={selectedProvinceCode}
              onChange={handleProvinceChange}
              disabled={disabled || loadingProvinces}
              className={selectStyle}
            >
              <option value="">-- Chọn Tỉnh/Thành phố --</option>
              {provinces.map((p) => (
                <option key={p.code} value={p.code} className={darkTheme ? 'bg-slate-900 text-white' : ''}>
                  {p.name}
                </option>
              ))}
            </select>
            {loadingProvinces && (
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin absolute right-3 top-3 pointer-events-none" />
            )}
          </div>
        </div>

        <div>
          <label className={labelStyle}>Quận / Huyện *</label>
          <div className="relative">
            <select
              value={selectedDistrictCode}
              onChange={handleDistrictChange}
              disabled={disabled || !selectedProvinceCode || loadingDistricts}
              className={selectStyle}
            >
              <option value="">
                {!selectedProvinceCode ? '-- Chọn Tỉnh/TP trước --' : '-- Chọn Quận/Huyện --'}
              </option>
              {districts.map((d) => (
                <option key={d.code} value={d.code} className={darkTheme ? 'bg-slate-900 text-white' : ''}>
                  {d.name}
                </option>
              ))}
            </select>
            {loadingDistricts && (
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin absolute right-3 top-3 pointer-events-none" />
            )}
          </div>
        </div>
      </div>

      {/* Ward & Street Address Row */}
      <div className={layout === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'space-y-3'}>
        <div>
          <label className={labelStyle}>Phường / Xã *</label>
          <div className="relative">
            <select
              value={value.ward}
              onChange={handleWardChange}
              disabled={disabled || !selectedDistrictCode || loadingWards}
              className={selectStyle}
            >
              <option value="">
                {!selectedDistrictCode
                  ? '-- Chọn Quận/Huyện trước --'
                  : loadingWards
                  ? '-- Đang tải danh sách Phường/Xã... --'
                  : '-- Chọn Phường/Xã --'}
              </option>
              {wards.map((w) => (
                <option key={w.code} value={w.name} className={darkTheme ? 'bg-slate-900 text-white' : ''}>
                  {w.name}
                </option>
              ))}
            </select>
            {loadingWards && (
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin absolute right-3 top-3 pointer-events-none" />
            )}
          </div>
        </div>

        <div>
          <label className={labelStyle}>Tòa nhà, hẻm, đường *</label>
          <div className="relative">
            <input
              type="text"
              required
              disabled={disabled}
              value={value.address}
              onChange={handleStreetChange}
              placeholder="VD: Số 123 Đường Nguyễn Trãi..."
              className={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* Special Landmark / Notes field (Optional) */}
      {showNoteField && (
        <div>
          <label className={labelStyle}>Ghi chú địa chỉ / Vị trí đặc biệt (Không bắt buộc)</label>
          <input
            type="text"
            disabled={disabled}
            value={value.note || ''}
            onChange={handleNoteChange}
            placeholder="VD: Cạnh cây xăng Hàng Xanh, giao giờ hành chính..."
            className={inputStyle}
          />
        </div>
      )}
    </div>
  );
};
