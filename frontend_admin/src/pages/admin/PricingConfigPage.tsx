import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Ticket,
  Save,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Percent,
  Layers,
  X,
} from 'lucide-react';
import { pricingApi, type PricingConfig, type VoucherItem } from '../../api/pricing.api';

export const PricingConfigPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pricing' | 'vouchers'>('pricing');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Config State
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [vouchers, setVouchers] = useState<VoucherItem[]>([]);

  // Voucher Modal
  const [showVoucherModal, setShowVoucherModal] = useState<boolean>(false);
  const [voucherCode, setVoucherCode] = useState<string>('');
  const [voucherDesc, setVoucherDesc] = useState<string>('');
  const [voucherType, setVoucherType] = useState<'FIXED' | 'PERCENT'>('FIXED');
  const [voucherVal, setVoucherVal] = useState<number>(15000);
  const [voucherMax, setVoucherMax] = useState<number>(50000);
  const [voucherActive, setVoucherActive] = useState<boolean>(true);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await pricingApi.getPricingAndVouchers();
      if (res.data?.success) {
        setConfig(res.data.data.pricing);
        setVouchers(res.data.data.vouchers || []);
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Không thể tải cấu hình bảng giá');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    setSaving(true);
    try {
      const res = await pricingApi.updatePricingConfig(config);
      if (res.data?.success) {
        showToast('success', 'Đã lưu cấu hình bảng giá phí ship thành công!');
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Lỗi khi lưu bảng giá');
    } finally {
      setSaving(false);
    }
  };

  const handleZoneChange = (zoneKey: keyof PricingConfig['zones'], field: string, value: number) => {
    if (!config) return;
    setConfig({
      ...config,
      zones: {
        ...config.zones,
        [zoneKey]: {
          ...config.zones[zoneKey],
          [field]: Number(value),
        },
      },
    });
  };

  const handleSaveVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherCode.trim()) {
      showToast('error', 'Vui lòng nhập mã voucher');
      return;
    }

    try {
      const payload: VoucherItem = {
        code: voucherCode.trim().toUpperCase(),
        description: voucherDesc.trim(),
        discountType: voucherType,
        value: Number(voucherVal),
        maxDiscount: voucherType === 'PERCENT' ? Number(voucherMax) : undefined,
        active: voucherActive,
      };

      const res = await pricingApi.saveVoucher(payload);
      if (res.data?.success) {
        showToast('success', res.data.message);
        setVouchers(res.data.data);
        setShowVoucherModal(false);
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Lỗi khi lưu voucher');
    }
  };

  const handleDeleteVoucher = async (code: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa mã voucher ${code}?`)) return;
    try {
      const res = await pricingApi.deleteVoucher(code);
      if (res.data?.success) {
        showToast('success', res.data.message);
        setVouchers(res.data.data);
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Không thể xóa voucher');
    }
  };

  const toggleVoucherActive = async (voucher: VoucherItem) => {
    try {
      const updated = { ...voucher, active: !voucher.active };
      const res = await pricingApi.saveVoucher(updated);
      if (res.data?.success) {
        showToast('success', `Đã ${updated.active ? 'kích hoạt' : 'tạm dừng'} voucher ${voucher.code}`);
        setVouchers(res.data.data);
      }
    } catch (err: any) {
      showToast('error', 'Lỗi khi cập nhật trạng thái voucher');
    }
  };

  const formatVnd = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + ' đ';

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700'
              : 'bg-rose-950/90 text-rose-300 border-rose-700'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-emerald-400" /> Quản Lý Bảng Giá Phí Ship & Voucher
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Điều chỉnh linh hoạt công thức tính cước 4 tuyến vận chuyển, phụ trội thể tích DIM, bảo hiểm và mã khuyến mãi
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Tải lại"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 w-fit gap-2">
        <button
          onClick={() => setActiveTab('pricing')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'pricing'
              ? 'bg-emerald-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" /> Bảng Giá Cước Tuyến & Khối Lượng
        </button>
        <button
          onClick={() => setActiveTab('vouchers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'vouchers'
              ? 'bg-emerald-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Ticket className="w-4 h-4" /> Quản Lý Voucher Khuyến Mãi ({vouchers.length})
        </button>
      </div>

      {loading || !config ? (
        <div className="p-16 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-400" />
          <p className="text-sm">Đang tải dữ liệu cấu hình...</p>
        </div>
      ) : activeTab === 'pricing' ? (
        <form onSubmit={handleSavePricing} className="space-y-6">
          {/* Card: 4 Zones Pricing Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" /> Cước Cơ Bản Theo Tuyến Vận Chuyển (Zone Tier Pricing)
            </h3>
            <p className="text-xs text-slate-400">
              Mức cước tiêu chuẩn áp dụng cho bưu kiện từ 0 đến 1.0 kg và cước tăng thêm cho mỗi 0.5 kg phụ trội.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* INTRA_PROVINCE */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">🏙️ Nội Tỉnh (Intra-Province)</span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono font-bold">
                    Cùng tỉnh/thành
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Cước cơ bản (≤ 1.0 kg)</label>
                    <input
                      type="number"
                      step="500"
                      value={config.zones.INTRA_PROVINCE.baseFee}
                      onChange={(e) => handleZoneChange('INTRA_PROVINCE', 'baseFee', Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Cước phụ trội / 0.5 kg</label>
                    <input
                      type="number"
                      step="500"
                      value={config.zones.INTRA_PROVINCE.extraWeightFee}
                      onChange={(e) => handleZoneChange('INTRA_PROVINCE', 'extraWeightFee', Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* INTRA_REGION */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">🗺️ Nội Miền (Intra-Region)</span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono font-bold">
                    Cùng miền Bắc/Trung/Nam
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Cước cơ bản (≤ 1.0 kg)</label>
                    <input
                      type="number"
                      step="500"
                      value={config.zones.INTRA_REGION.baseFee}
                      onChange={(e) => handleZoneChange('INTRA_REGION', 'baseFee', Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Cước phụ trội / 0.5 kg</label>
                    <input
                      type="number"
                      step="500"
                      value={config.zones.INTRA_REGION.extraWeightFee}
                      onChange={(e) => handleZoneChange('INTRA_REGION', 'extraWeightFee', Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* NEAR_REGION */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">🚗 Cận Miền (Near-Region)</span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono font-bold">
                    Miền liền kề (Bắc - Trung)
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Cước cơ bản (≤ 1.0 kg)</label>
                    <input
                      type="number"
                      step="500"
                      value={config.zones.NEAR_REGION.baseFee}
                      onChange={(e) => handleZoneChange('NEAR_REGION', 'baseFee', Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Cước phụ trội / 0.5 kg</label>
                    <input
                      type="number"
                      step="500"
                      value={config.zones.NEAR_REGION.extraWeightFee}
                      onChange={(e) => handleZoneChange('NEAR_REGION', 'extraWeightFee', Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* INTER_REGION */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">✈️ Liên Miền (Inter-Region)</span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 font-mono font-bold">
                    Bắc - Nam cách xa
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Cước cơ bản (≤ 1.0 kg)</label>
                    <input
                      type="number"
                      step="500"
                      value={config.zones.INTER_REGION.baseFee}
                      onChange={(e) => handleZoneChange('INTER_REGION', 'baseFee', Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Cước phụ trội / 0.5 kg</label>
                    <input
                      type="number"
                      step="500"
                      value={config.zones.INTER_REGION.extraWeightFee}
                      onChange={(e) => handleZoneChange('INTER_REGION', 'extraWeightFee', Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Bảo hiểm & Rủi ro */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Phí Khai Giá / Bảo Hiểm */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Percent className="w-5 h-5 text-amber-400" /> Phí Bảo Hiểm Hàng Hóa (Khai Giá)
              </h3>
              <p className="text-xs text-slate-400">
                Thu thêm phí bảo hiểm đối với hàng hóa có giá trị khai báo vượt mức ngưỡng miễn phí.
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Ngưỡng bắt đầu tính bảo hiểm (VNĐ)</label>
                  <input
                    type="number"
                    step="100000"
                    value={config.insurance?.threshold || 1000000}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        insurance: { ...config.insurance, threshold: Number(e.target.value) },
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Ví dụ: 1.000.000 đ (hàng ≤ 1 triệu được bảo hiểm miễn phí)
                  </span>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Tỷ lệ phí bảo hiểm (Ví dụ: 0.005 tương đương 0.5%)</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    max="0.1"
                    value={config.insurance?.rate || 0.005}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        insurance: { ...config.insurance, rate: Number(e.target.value) },
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Đang thiết lập: {((config.insurance?.rate || 0.005) * 100).toFixed(2)}% giá trị hàng
                  </span>
                </div>
              </div>
            </div>

            {/* Cảnh Báo Rủi Ro (Risk Engine Guards) */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-400" /> Ngưỡng Cảnh Báo Rủi Ro (Risk Guards)
              </h3>
              <p className="text-xs text-slate-400">
                Đơn hàng chạm các ngưỡng này sẽ tự động chuyển sang trạng thái <b>PENDING_VERIFICATION</b> để nhân viên kiểm tra.
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Cảnh báo Cước Vận Chuyển Bất Thường (VNĐ)</label>
                  <input
                    type="number"
                    step="50000"
                    value={config.riskThresholds?.feeWarning || 500000}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        riskThresholds: { ...config.riskThresholds, feeWarning: Number(e.target.value) },
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Cảnh báo Tiền Thu Hộ COD Khủng (VNĐ)</label>
                  <input
                    type="number"
                    step="1000000"
                    value={config.riskThresholds?.codWarning || 10000000}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        riskThresholds: { ...config.riskThresholds, codWarning: Number(e.target.value) },
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl flex items-center gap-2 transition"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Lưu Toàn Bộ Cấu Hình Bảng Giá
            </button>
          </div>
        </form>
      ) : (
        /* TAB 2: VOUCHERS */
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div>
              <h3 className="font-bold text-white text-sm">Danh Sách Mã Khuyến Mãi (Vouchers)</h3>
              <p className="text-xs text-slate-400">Các mã giảm giá đang kích hoạt hoặc tạm dừng trên toàn hệ thống</p>
            </div>
            <button
              onClick={() => {
                setVoucherCode('');
                setVoucherDesc('');
                setVoucherType('FIXED');
                setVoucherVal(15000);
                setVoucherMax(50000);
                setVoucherActive(true);
                setShowVoucherModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition shadow"
            >
              <Plus className="w-4 h-4" /> Thêm Mã Khuyến Mãi
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                  <th className="p-4">Mã Voucher</th>
                  <th className="p-4">Mô Tả Áp Dụng</th>
                  <th className="p-4">Loại Giảm</th>
                  <th className="p-4">Mức Giảm</th>
                  <th className="p-4">Giảm Tối Đa</th>
                  <th className="p-4">Trạng Thái</th>
                  <th className="p-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {vouchers.map((v) => (
                  <tr key={v.code} className="hover:bg-slate-800/30 transition">
                    <td className="p-4 font-mono font-bold text-emerald-400 text-sm">{v.code}</td>
                    <td className="p-4 text-white">{v.description || 'Không có mô tả'}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                        {v.discountType === 'PERCENT' ? 'Giảm theo %' : 'Giảm tiền cố định'}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-white">
                      {v.discountType === 'PERCENT' ? `${v.value * 100}%` : formatVnd(v.value)}
                    </td>
                    <td className="p-4 font-mono text-slate-400">
                      {v.maxDiscount ? formatVnd(v.maxDiscount) : 'Không giới hạn'}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => toggleVoucherActive(v)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border transition ${
                          v.active
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {v.active ? 'ĐANG KÍCH HOẠT' : 'TẠM TẮT'}
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDeleteVoucher(v.code)}
                        className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 transition"
                        title="Xóa voucher"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL TẠO VOUCHER */}
      {showVoucherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Ticket className="w-5 h-5 text-emerald-400" /> Thêm Mã Khuyến Mãi Mới
              </h3>
              <button onClick={() => setShowVoucherModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVoucher} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Mã Voucher (Code)</label>
                <input
                  type="text"
                  required
                  placeholder="VD: FREESHIP30"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Mô tả hiển thị</label>
                <input
                  type="text"
                  placeholder="VD: Miễn giảm 30k cước nội miền"
                  value={voucherDesc}
                  onChange={(e) => setVoucherDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Hình thức giảm</label>
                  <select
                    value={voucherType}
                    onChange={(e) => setVoucherType(e.target.value as 'FIXED' | 'PERCENT')}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="FIXED">Giảm tiền mặt (VNĐ)</option>
                    <option value="PERCENT">Giảm phần trăm (%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    {voucherType === 'PERCENT' ? 'Tỷ lệ giảm (0.5 = 50%)' : 'Số tiền giảm (VNĐ)'}
                  </label>
                  <input
                    type="number"
                    step={voucherType === 'PERCENT' ? '0.05' : '1000'}
                    required
                    value={voucherVal}
                    onChange={(e) => setVoucherVal(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              {voucherType === 'PERCENT' && (
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Mức giảm tối đa (VNĐ)</label>
                  <input
                    type="number"
                    step="5000"
                    value={voucherMax}
                    onChange={(e) => setVoucherMax(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="voucherActive"
                  checked={voucherActive}
                  onChange={(e) => setVoucherActive(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                />
                <label htmlFor="voucherActive" className="text-slate-300 font-bold">
                  Kích hoạt mã này ngay lập tức
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowVoucherModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow"
                >
                  Lưu Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
