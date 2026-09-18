import React from 'react';
import { Truck, Package } from 'lucide-react';
import type { PickupAddressItem } from '../../../api/seller.api';
import type { Province, District, Ward } from '../../../api/location.api';
import { VIETNAM_ADMIN_UNITS } from './types';

interface SenderAddressSectionProps {
  pickupType: string;
  setPickupType: (val: string) => void;
  pickupProvince: string;
  setPickupProvince: (val: string) => void;
  pickupDistrict: string;
  setPickupDistrict: (val: string) => void;
  pickupWard: string;
  setPickupWard: (val: string) => void;
  pickupSubZone: string;
  setPickupSubZone: (val: string) => void;
  pickupDetailAddress: string;
  setPickupDetailAddress: (val: string) => void;
  savedPickupAddresses: PickupAddressItem[];
  selectedPickupAddressId: string;
  handleSelectSavedPickupAddress: (id: string) => void;
  provincesList: Province[];
  pickupDistrictsList: District[];
  pickupWardsList: Ward[];
  pickupTimeSlot: string;
  setPickupTimeSlot: (val: string) => void;
  deliveryTimeSlot: string;
  setDeliveryTimeSlot: (val: string) => void;
  isBulky: boolean;
  chargeableWeight: number;
  cleanStreetAddress: (raw?: string) => string;
}

export const SenderAddressSection: React.FC<SenderAddressSectionProps> = ({
  pickupType,
  setPickupType,
  pickupProvince,
  setPickupProvince,
  pickupDistrict,
  setPickupDistrict,
  pickupWard,
  setPickupWard,
  pickupSubZone,
  setPickupSubZone,
  pickupDetailAddress,
  setPickupDetailAddress,
  savedPickupAddresses,
  selectedPickupAddressId,
  handleSelectSavedPickupAddress,
  provincesList,
  pickupDistrictsList,
  pickupWardsList,
  pickupTimeSlot,
  setPickupTimeSlot,
  deliveryTimeSlot,
  setDeliveryTimeSlot,
  isBulky,
  chargeableWeight,
  cleanStreetAddress,
}) => {
  return (
    <div className="glass-panel rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-5 shadow-xl">
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-4">
        <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
          <Truck className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            2. Phương Thức Vận Chuyển &amp; Lấy Hàng
          </h3>
          <p className="text-[11px] text-slate-600 dark:text-slate-400">
            Lựa chọn gói giao hàng và địa điểm lấy hàng của Shop
          </p>
        </div>
      </div>

      {/* Auto Service Type Classification Badge */}
      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isBulky
                ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30'
                : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
            }`}
          >
            {isBulky ? <Package className="w-5 h-5" /> : <Truck className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-xs text-slate-900 dark:text-white">
                {isBulky ? 'BBS Hàng Lớn / Cồng Kềnh' : 'EXPRESS Tiêu Chuẩn'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 uppercase">
                Hệ Thống Tự Tính
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
              {isBulky
                ? 'Trọng lượng tính cước > 30kg hoặc cạnh > 80cm — Bố trí xe tải / bán tải'
                : 'Trọng lượng tính cước ≤ 30kg & kích thước ≤ 80cm — Giao nhận xe máy'}
            </p>
          </div>
        </div>

        <div className="text-left sm:text-right shrink-0">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Trọng lượng tính cước</span>
          <span className="text-sm font-mono font-black text-slate-900 dark:text-white">
            {chargeableWeight.toFixed(1)} kg
          </span>
        </div>
      </div>

      {/* Transport Mode & Time Slots */}
      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
            <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Mạng Lưới Đường Bộ Tuyến Trục (Hub-to-Hub)</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            Chuẩn Vận Hành
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800/80">
          <div>
            <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1">
              Khung giờ hẹn lấy hàng
            </label>
            <select
              value={pickupTimeSlot}
              onChange={(e) => setPickupTimeSlot(e.target.value)}
              className="w-full glass-input rounded-xl px-2.5 py-2 min-h-[44px] text-xs text-slate-900 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:border-blue-500"
            >
              <option value="Hẹn lấy" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                Hẹn lấy linh hoạt
              </option>
              <option value="Sáng nay (08h - 12h)" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                Sáng nay (08h - 12h)
              </option>
              <option value="Chiều nay (13h - 17h)" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                Chiều nay (13h - 17h)
              </option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1">
              Khung giờ hẹn giao hàng
            </label>
            <select
              value={deliveryTimeSlot}
              onChange={(e) => setDeliveryTimeSlot(e.target.value)}
              className="w-full glass-input rounded-xl px-2.5 py-2 min-h-[44px] text-xs text-slate-900 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:border-blue-500"
            >
              <option value="Hẹn giao" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                Hẹn giao linh hoạt
              </option>
              <option value="Giờ hành chính" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                Giờ hành chính
              </option>
              <option value="Buổi tối (18h - 21h)" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                Buổi tối (18h - 21h)
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Warehouse / Pickup Location Configuration */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Địa điểm lấy hàng của Shop (First-mile pickup)
          </label>
          {savedPickupAddresses.length > 0 && (
            <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono">
              Đã lưu {savedPickupAddresses.length} địa chỉ kho
            </span>
          )}
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white cursor-pointer min-h-[44px] sm:min-h-0">
              <input
                type="radio"
                name="pickupType"
                checked={pickupType === 'cod'}
                onChange={() => setPickupType('cod')}
                className="text-blue-500 focus:ring-0 cursor-pointer w-4 h-4"
              />
              <span>Lấy hàng tận nơi (Kho Shop / Điểm lấy)</span>
            </label>
            <span className="text-[10px] text-cyan-700 dark:text-cyan-400 font-mono font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 self-start sm:self-auto">
              Địa bàn lấy: {pickupProvince}
            </span>
          </div>

          {/* Dropdown chọn từ danh bạ kho lấy hàng đã lưu */}
          {savedPickupAddresses.length > 0 && (
            <div className="pt-1">
              <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Chọn từ danh bạ kho hàng đã lưu:
              </label>
              <select
                value={selectedPickupAddressId}
                onChange={(e) => handleSelectSavedPickupAddress(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 min-h-[44px] text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-medium"
              >
                {savedPickupAddresses.map((addr) => (
                  <option
                    key={addr._id}
                    value={addr._id}
                    className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    {addr.label ? `[${addr.label}] ` : ''}
                    {cleanStreetAddress(addr.addressDetail)}, {addr.ward}, {addr.district}{' '}
                    {addr.isDefault ? '⭐ (Mặc định)' : ''}
                  </option>
                ))}
                <option value="custom" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  ➕ Nhập địa chỉ kho khác (Tùy chỉnh)...
                </option>
              </select>
            </div>
          )}

          {/* Tóm tắt địa chỉ đã chọn hoặc Form nhập tay tùy chỉnh */}
          {selectedPickupAddressId !== 'custom' && savedPickupAddresses.length > 0 ? (
            <div className="p-3 rounded-xl bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 text-xs space-y-1">
              <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                <span>{pickupDetailAddress}</span>
                <span className="text-[10px] text-cyan-700 dark:text-cyan-400 font-mono font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  {pickupProvince}
                </span>
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400">
                {pickupWard}, {pickupDistrict}, {pickupProvince}{' '}
                {pickupSubZone ? `• Cụm: ${pickupSubZone}` : ''}
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                    Tỉnh lấy hàng
                  </label>
                  <select
                    value={pickupProvince}
                    onChange={(e) => setPickupProvince(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 min-h-[44px] text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  >
                    {provincesList.length > 0
                      ? provincesList.map((p) => (
                          <option
                            key={p.code}
                            value={p.name}
                            className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          >
                            {p.name}
                          </option>
                        ))
                      : Object.keys(VIETNAM_ADMIN_UNITS).map((p) => (
                          <option
                            key={p}
                            value={p}
                            className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          >
                            {p}
                          </option>
                        ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                    Quận/Huyện lấy
                  </label>
                  <select
                    value={pickupDistrict}
                    onChange={(e) => setPickupDistrict(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 min-h-[44px] text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  >
                    {pickupDistrictsList.length > 0
                      ? pickupDistrictsList.map((d) => (
                          <option
                            key={d.code}
                            value={d.name}
                            className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          >
                            {d.name}
                          </option>
                        ))
                      : Object.keys(VIETNAM_ADMIN_UNITS[pickupProvince] || {}).map((d) => (
                          <option
                            key={d}
                            value={d}
                            className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          >
                            {d}
                          </option>
                        ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                    Phường/Xã lấy
                  </label>
                  <select
                    value={pickupWard}
                    onChange={(e) => setPickupWard(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 min-h-[44px] text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  >
                    {pickupWardsList.length > 0
                      ? pickupWardsList.map((w) => (
                          <option
                            key={w.code}
                            value={w.name}
                            className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          >
                            {w.name}
                          </option>
                        ))
                      : (VIETNAM_ADMIN_UNITS[pickupProvince]?.[pickupDistrict] || []).map((w) => (
                          <option
                            key={w}
                            value={w}
                            className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          >
                            {w}
                          </option>
                        ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                    Khu phố lấy
                  </label>
                  <input
                    type="text"
                    value={pickupSubZone}
                    onChange={(e) => setPickupSubZone(e.target.value)}
                    placeholder="VD: Khu phố 1..."
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 min-h-[44px] text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                  Số nhà / Tên đường kho lấy
                </label>
                <input
                  type="text"
                  value={pickupDetailAddress}
                  onChange={(e) => setPickupDetailAddress(e.target.value)}
                  placeholder="VD: 123 Đường Tân Bình..."
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 min-h-[44px] text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
