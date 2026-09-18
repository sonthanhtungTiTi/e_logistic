import React from 'react';
import { User, Phone, MapPin, Home, Info } from 'lucide-react';
import type { Province, District, Ward } from '../../../api/location.api';
import { VIETNAM_ADMIN_UNITS, type TouchedFields } from './types';

interface ReceiverAddressSectionProps {
  receiverPhone: string;
  setReceiverPhone: (val: string) => void;
  receiverName: string;
  setReceiverName: (val: string) => void;
  detailAddress: string;
  setDetailAddress: (val: string) => void;
  deliveryProvince: string;
  setDeliveryProvince: (val: string) => void;
  deliveryDistrict: string;
  setDeliveryDistrict: (val: string) => void;
  deliveryWard: string;
  setDeliveryWard: (val: string) => void;
  deliverySubZone: string;
  setDeliverySubZone: (val: string) => void;
  provincesList: Province[];
  deliveryDistrictsList: District[];
  deliveryWardsList: Ward[];
  touchedFields: TouchedFields;
  handleFieldBlur: (field: string) => void;
}

export const ReceiverAddressSection: React.FC<ReceiverAddressSectionProps> = ({
  receiverPhone,
  setReceiverPhone,
  receiverName,
  setReceiverName,
  detailAddress,
  setDetailAddress,
  deliveryProvince,
  setDeliveryProvince,
  deliveryDistrict,
  setDeliveryDistrict,
  deliveryWard,
  setDeliveryWard,
  deliverySubZone,
  setDeliverySubZone,
  provincesList,
  deliveryDistrictsList,
  deliveryWardsList,
  touchedFields,
  handleFieldBlur,
}) => {
  const isPhoneInvalid =
    touchedFields.phone &&
    (!receiverPhone.trim() ||
      !/^(\+?84|0)[0-9]{9,10}$/.test(receiverPhone.trim().replace(/[^0-9+]/g, '')));

  return (
    <div className="glass-panel rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-5 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <User className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              1. Thông Tin Người Nhận &amp; Địa Chỉ Giao Hàng
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Nhập đầy đủ thông tin chuẩn sau sáp nhập
            </p>
          </div>
        </div>
      </div>

      {/* Post-merger notice badge */}
      <div className="p-3.5 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-2xl flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-300">
        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div>
          <strong className="block font-bold">Lưu ý: Nhập địa chỉ hành chính sau sáp nhập</strong>
          <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-0.5">
            Vui lòng chọn chính xác Tỉnh/Thành, Quận/Huyện, Phường/Xã và nhập Cụm tuyến/Khu phố để hệ thống tự động điều phối Shipper phụ trách phù hợp.
          </p>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        {/* Phone Input */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Số điện thoại người nhận <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Phone className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3.5" />
            <input
              id="input-receiver-phone"
              type="tel"
              inputMode="tel"
              value={receiverPhone}
              onChange={(e) => setReceiverPhone(e.target.value)}
              onBlur={() => handleFieldBlur('phone')}
              placeholder="VD: 0912345678"
              className={`w-full glass-input rounded-xl pl-10 pr-4 py-2.5 min-h-[44px] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-900/90 border outline-none transition font-mono ${
                isPhoneInvalid
                  ? 'border-rose-500/80 bg-rose-50 dark:bg-rose-950/20'
                  : 'border-slate-200 dark:border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
              }`}
            />
          </div>
          {isPhoneInvalid && (
            <p className="text-[10px] text-rose-500 font-medium mt-1 animate-in fade-in duration-200">
              ⚠️ Vui lòng nhập SĐT người nhận hợp lệ (VD: 0912345678)
            </p>
          )}
        </div>

        {/* Name Input */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Họ &amp; tên người nhận <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3.5" />
            <input
              id="input-receiver-name"
              type="text"
              value={receiverName}
              onChange={(e) => setReceiverName(e.target.value)}
              onBlur={() => handleFieldBlur('name')}
              placeholder="VD: Nguyễn Văn A"
              maxLength={255}
              className={`w-full glass-input rounded-xl pl-10 pr-4 py-2.5 min-h-[44px] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-900/90 border outline-none transition ${
                touchedFields.name && !receiverName.trim()
                  ? 'border-rose-500/80 bg-rose-50 dark:bg-rose-950/20'
                  : 'border-slate-200 dark:border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
              }`}
            />
          </div>
          {touchedFields.name && !receiverName.trim() && (
            <p className="text-[10px] text-rose-500 font-medium mt-1 animate-in fade-in duration-200">
              ⚠️ Vui lòng nhập họ &amp; tên người nhận
            </p>
          )}
        </div>

        {/* 5-Level Structured Address for Receiver */}
        <div className="space-y-3 pt-1">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            Cấu trúc địa chỉ giao hàng (sau sáp nhập) <span className="text-rose-500">*</span>
          </label>

          {/* Province & District */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Tỉnh / Thành phố
              </label>
              <select
                value={deliveryProvince}
                onChange={(e) => setDeliveryProvince(e.target.value)}
                className="w-full glass-input rounded-xl px-3 py-2.5 min-h-[44px] text-xs text-slate-900 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:border-blue-500"
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
              <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Quận / Huyện
              </label>
              <select
                value={deliveryDistrict}
                onChange={(e) => setDeliveryDistrict(e.target.value)}
                className="w-full glass-input rounded-xl px-3 py-2.5 min-h-[44px] text-xs text-slate-900 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:border-blue-500"
              >
                {deliveryDistrictsList.length > 0
                  ? deliveryDistrictsList.map((d) => (
                      <option
                        key={d.code}
                        value={d.name}
                        className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      >
                        {d.name}
                      </option>
                    ))
                  : Object.keys(VIETNAM_ADMIN_UNITS[deliveryProvince] || {}).map((d) => (
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

          {/* Ward & SubZone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Phường / Xã
              </label>
              <select
                value={deliveryWard}
                onChange={(e) => setDeliveryWard(e.target.value)}
                className="w-full glass-input rounded-xl px-3 py-2.5 min-h-[44px] text-xs text-slate-900 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:border-blue-500"
              >
                {deliveryWardsList.length > 0
                  ? deliveryWardsList.map((w) => (
                      <option
                        key={w.code}
                        value={w.name}
                        className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      >
                        {w.name}
                      </option>
                    ))
                  : (VIETNAM_ADMIN_UNITS[deliveryProvince]?.[deliveryDistrict] || []).map((w) => (
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
              <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Khu phố / Thôn / Cụm tuyến <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={deliverySubZone}
                onChange={(e) => setDeliverySubZone(e.target.value)}
                placeholder="VD: Khu phố 5..."
                className="w-full glass-input rounded-xl px-3 py-2.5 min-h-[44px] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Detail Address Input */}
          <div className="space-y-1 pt-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Số nhà &amp; Tên đường chi tiết <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Home className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3.5" />
              <input
                id="input-detail-address"
                type="text"
                value={detailAddress}
                onChange={(e) => setDetailAddress(e.target.value)}
                onBlur={() => handleFieldBlur('address')}
                placeholder="Số 123/45 đường..."
                className={`w-full glass-input rounded-xl pl-10 pr-4 py-2.5 min-h-[44px] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-900/90 border outline-none transition ${
                  touchedFields.address && !detailAddress.trim()
                    ? 'border-rose-500/80 bg-rose-50 dark:bg-rose-950/20'
                    : 'border-slate-200 dark:border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                }`}
              />
            </div>
            {touchedFields.address && !detailAddress.trim() && (
              <p className="text-[10px] text-rose-500 font-medium mt-1 animate-in fade-in duration-200">
                ⚠️ Vui lòng nhập số nhà và tên đường giao hàng chi tiết
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
