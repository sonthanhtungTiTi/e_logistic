import { useState } from 'react';
import { Calculator as CalcIcon, Scale, Box, ArrowRight, Info, Sparkles } from 'lucide-react';
import type { CalculatorParams } from '../../types';

interface CalculatorProps {
  onApplyToNewOrder?: (params: CalculatorParams, calculatedCost: number, chargeableWeight: number) => void;
}

export const Calculator: React.FC<CalculatorProps> = ({ onApplyToNewOrder }) => {
  const [params, setParams] = useState<CalculatorParams>({
    weightKg: 3.5,
    lengthCm: 40,
    widthCm: 30,
    heightCm: 25,
    serviceType: 'EXPRESS',
  });

  // Calculate Volumetric Weight: (L * W * H) / 5000
  const volumetricWeightKg = Number(
    ((params.lengthCm * params.widthCm * params.heightCm) / 5000).toFixed(2)
  );

  // Chargeable Weight = max(actual, volumetric)
  const chargeableWeightKg = Math.max(params.weightKg, volumetricWeightKg);

  // Service base rates per kg
  const baseRates: Record<string, number> = {
    STANDARD: 22000,
    EXPRESS: 38000,
    COLD_CHAIN: 55000,
    HEAVY: 18000,
  };

  const estimatedCost = Math.round(
    chargeableWeightKg * (baseRates[params.serviceType] || 25000)
  );

  const isVolumetricHigher = volumetricWeightKg > params.weightKg;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase">
          <CalcIcon className="w-4 h-4" />
          Thuật Toán Logistics Chính Xác 100%
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
          Công Cụ Tính Cước Phí & Trọng Lượng Quy Đổi
        </h2>
        <p className="text-slate-400 text-sm max-w-2xl mx-auto">
          E-Logistic tự động áp dụng công thức quy đổi kích thước thể tích chuẩn IATA{' '}
          <code className="text-cyan-400 bg-slate-900 px-2 py-0.5 rounded font-mono">
            (Dài x Rộng x Cao) / 5000
          </code>{' '}
          để xác định trọng lượng tính cước chính xác.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Input Form Panel */}
        <div className="lg:col-span-7 glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Box className="w-5 h-5 text-blue-400" />
            1. Thông Số Hàng Hóa & Tuyến Vận Chuyển
          </h3>

          {/* City Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase">Tỉnh / Thành Gửi</label>
              <select
                value={params.originCity}
                onChange={(e) => setParams({ ...params, originCity: e.target.value })}
                className="w-full glass-input rounded-xl px-4 py-2.5 text-sm"
              >
                <option value="Hồ Chí Minh" className="bg-slate-900">TP. Hồ Chí Minh</option>
                <option value="Hà Nội" className="bg-slate-900">Hà Nội</option>
                <option value="Đà Nẵng" className="bg-slate-900">Đà Nẵng</option>
                <option value="Cần Thơ" className="bg-slate-900">Cần Thơ</option>
                <option value="Bình Dương" className="bg-slate-900">Bình Dương</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase">Tỉnh / Thành Nhận</label>
              <select
                value={params.destinationCity}
                onChange={(e) => setParams({ ...params, destinationCity: e.target.value })}
                className="w-full glass-input rounded-xl px-4 py-2.5 text-sm"
              >
                <option value="Hà Nội" className="bg-slate-900">Hà Nội</option>
                <option value="Hồ Chí Minh" className="bg-slate-900">TP. Hồ Chí Minh</option>
                <option value="Đà Nẵng" className="bg-slate-900">Đà Nẵng</option>
                <option value="Cần Thơ" className="bg-slate-900">Cần Thơ</option>
                <option value="Bình Dương" className="bg-slate-900">Bình Dương</option>
              </select>
            </div>
          </div>

          {/* Service Type Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2 uppercase">Gói Dịch Vụ Vận Chuyển</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'STANDARD', label: 'Tiêu Chuẩn', desc: 'Tiết kiệm' },
                { id: 'EXPRESS', label: 'Hỏa Tốc', desc: 'Giao nhanh' },
                { id: 'COLD_CHAIN', label: 'Xe Lạnh 2-8°C', desc: 'Dược phẩm' },
                { id: 'HEAVY', label: 'Hàng Nặng', desc: 'Tải trọng lớn' },
              ].map((svc) => (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => setParams({ ...params, serviceType: svc.id as any })}
                  className={`p-3 rounded-xl text-left border transition cursor-pointer ${
                    params.serviceType === svc.id
                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-md shadow-blue-500/10'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold text-white">{svc.label}</div>
                  <div className="text-[10px] text-slate-400">{svc.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Weight Input */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase">Trọng Lượng Thực Thực Tế (kg)</label>
              <span className="text-sm font-extrabold text-blue-400">{params.weightKg} kg</span>
            </div>
            <input
              type="number"
              step="0.1"
              min="0.1"
              max="200"
              value={params.weightKg}
              onChange={(e) => setParams({ ...params, weightKg: Math.max(0.1, parseFloat(e.target.value) || 0) })}
              className="w-full glass-input rounded-xl px-4 py-2.5 text-sm font-mono"
            />
          </div>

          {/* Dimensions Input (Length, Width, Height) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300 uppercase">Kích Thước Kiện Hàng (Dài x Rộng x Cao cm)</label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <span className="text-[10px] text-slate-400 block mb-1">Dài (cm)</span>
                <input
                  type="number"
                  min="1"
                  value={params.lengthCm}
                  onChange={(e) => setParams({ ...params, lengthCm: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-full glass-input rounded-xl px-3 py-2 text-sm font-mono text-center"
                />
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block mb-1">Rộng (cm)</span>
                <input
                  type="number"
                  min="1"
                  value={params.widthCm}
                  onChange={(e) => setParams({ ...params, widthCm: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-full glass-input rounded-xl px-3 py-2 text-sm font-mono text-center"
                />
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block mb-1">Cao (cm)</span>
                <input
                  type="number"
                  min="1"
                  value={params.heightCm}
                  onChange={(e) => setParams({ ...params, heightCm: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-full glass-input rounded-xl px-3 py-2 text-sm font-mono text-center"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Right Output Results Panel */}
        <div className="lg:col-span-5 glass-panel p-6 sm:p-8 rounded-3xl border border-blue-500/30 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>

          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Scale className="w-5 h-5 text-cyan-400" />
            2. Kết Quả Tính Cước Phí
          </h3>

          {/* Comparison Cards: Actual vs Volumetric */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`p-4 rounded-2xl border transition ${!isVolumetricHigher ? 'bg-blue-600/20 border-blue-500' : 'bg-slate-900/60 border-slate-800'}`}>
              <div className="text-[11px] text-slate-400 font-semibold mb-1">Trọng Lượng Thực</div>
              <div className="text-2xl font-black text-white">{params.weightKg} <span className="text-xs font-normal text-slate-400">kg</span></div>
              {!isVolumetricHigher && (
                <span className="inline-block mt-2 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  ✓ Áp dụng tính cước
                </span>
              )}
            </div>

            <div className={`p-4 rounded-2xl border transition ${isVolumetricHigher ? 'bg-cyan-600/20 border-cyan-500' : 'bg-slate-900/60 border-slate-800'}`}>
              <div className="text-[11px] text-slate-400 font-semibold mb-1">Quy Đổi Thể Tích (DIM)</div>
              <div className="text-2xl font-black text-cyan-300">{volumetricWeightKg} <span className="text-xs font-normal text-slate-400">kg</span></div>
              {isVolumetricHigher && (
                <span className="inline-block mt-2 text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  ✓ Áp dụng tính cước (Lớn hơn)
                </span>
              )}
            </div>
          </div>

          {/* Explanatory banner */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              Trọng lượng tính cước chính thức:{' '}
              <strong className="text-white font-mono text-sm">{chargeableWeightKg} kg</strong>.
              {isVolumetricHigher ? (
                <span> Kích thước kiện cồng kềnh hơn khối lượng thực tế nên áp dụng quy đổi thể tích.</span>
              ) : (
                <span> Khối lượng thực tế lớn hơn thể tích quy đổi.</span>
              )}
            </div>
          </div>

          {/* Final Estimated Cost Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-900/40 via-slate-900 to-slate-950 border border-blue-500/40 space-y-2 text-center shadow-xl">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng Cước Phí Ước Tính</span>
            <div className="text-4xl sm:text-5xl font-black text-white glow-gradient-text font-mono">
              {estimatedCost.toLocaleString('vi-VN')} <span className="text-xl font-bold text-blue-400">đ</span>
            </div>
            <p className="text-[11px] text-slate-400">Đã bao gồm phụ phí nhiên liệu & bảo hiểm hàng hóa cơ bản</p>
          </div>

          {/* Action button */}
          {onApplyToNewOrder && (
            <button
              onClick={() => onApplyToNewOrder(params, estimatedCost, chargeableWeightKg)}
              className="w-full py-4 rounded-xl shimmer-btn text-white font-bold text-sm shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer transition"
            >
              <Sparkles className="w-4 h-4" />
              Tạo Đơn Hàng Với Cước Phí Này
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

        </div>
      </div>
    </div>
  );
};
