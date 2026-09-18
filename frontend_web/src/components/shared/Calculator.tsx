import React, { useState } from 'react';
import { Scale, Box, ArrowRight, Info, Sparkles, AlertCircle, Check } from 'lucide-react';
import type { CalculatorParams } from '../../types';

interface CalculatorProps {
  onApplyToNewOrder?: (params: CalculatorParams, calculatedCost: number, chargeableWeight: number) => void;
}

export const Calculator: React.FC<CalculatorProps> = ({ onApplyToNewOrder }) => {
  // Flexible string input states to prevent input snapping on backspace
  const [weightInput, setWeightInput] = useState<string>('3.5');
  const [lengthInput, setLengthInput] = useState<string>('40');
  const [widthInput, setWidthInput] = useState<string>('30');
  const [heightInput, setHeightInput] = useState<string>('25');
  const [originCity, setOriginCity] = useState<string>('TP. Hồ Chí Minh');
  const [destinationCity, setDestinationCity] = useState<string>('Hà Nội');
  const [serviceType, setServiceType] = useState<'STANDARD' | 'EXPRESS' | 'COLD_CHAIN' | 'HEAVY'>('EXPRESS');

  // Parsed numerical values (fallback to 0 if invalid or empty)
  const numWeight = Math.max(0, parseFloat(weightInput) || 0);
  const numLength = Math.max(0, parseFloat(lengthInput) || 0);
  const numWidth = Math.max(0, parseFloat(widthInput) || 0);
  const numHeight = Math.max(0, parseFloat(heightInput) || 0);

  const isFormValid = numWeight > 0 && numLength > 0 && numWidth > 0 && numHeight > 0;

  // Calculate Volumetric Weight: (L * W * H) / 5000
  const volumetricWeightKg = Number(((numLength * numWidth * numHeight) / 5000).toFixed(2));

  // Chargeable Weight = max(actual, volumetric)
  const chargeableWeightKg = Math.max(numWeight, volumetricWeightKg);

  // Route distance factor calculation
  const getRouteFactor = (origin?: string, dest?: string) => {
    if (!origin || !dest) return { factor: 1.0, label: 'Nội vùng', badgeColor: 'bg-blue-500/10 border-blue-500/20 text-blue-400' };
    if (origin === dest) return { factor: 0.8, label: 'Nội thành / Nội tỉnh (-20%)', badgeColor: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' };

    const southGroup = ['Hồ Chí Minh', 'Bình Dương', 'Cần Thơ'];
    const northGroup = ['Hà Nội'];

    const isSameRegion =
      (southGroup.includes(origin) && southGroup.includes(dest)) ||
      (northGroup.includes(origin) && northGroup.includes(dest));

    if (isSameRegion) return { factor: 1.0, label: 'Nội vùng tiêu chuẩn', badgeColor: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' };
    return { factor: 1.45, label: 'Tuyến Bắc - Nam / Liên vùng (+45%)', badgeColor: 'bg-amber-500/10 border-amber-500/20 text-amber-400' };
  };

  const routeInfo = getRouteFactor(originCity, destinationCity);

  // Service base rates per kg
  const baseRates: Record<string, number> = {
    STANDARD: 22000,
    EXPRESS: 35000,
    COLD_CHAIN: 55000,
    HEAVY: 18000,
  };

  const estimatedCost = isFormValid
    ? Math.round(chargeableWeightKg * (baseRates[serviceType] || 25000) * routeInfo.factor)
    : 0;

  const isVolumetricHigher = volumetricWeightKg > numWeight;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Input Form Panel */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-5 shadow-sm dark:shadow-xl">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Box className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Thông Tin Kiện Hàng & Tuyến Giao
          </h3>

          {/* City Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase">Tỉnh / Thành Gửi</label>
              <select
                value={originCity}
                onChange={(e) => setOriginCity(e.target.value)}
                className="w-full glass-input rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
              >
                <option value="Hồ Chí Minh">TP. Hồ Chí Minh</option>
                <option value="Hà Nội">Hà Nội</option>
                <option value="Đà Nẵng">Đà Nẵng</option>
                <option value="Cần Thơ">Cần Thơ</option>
                <option value="Bình Dương">Bình Dương</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase">Tỉnh / Thành Nhận</label>
              <select
                value={destinationCity}
                onChange={(e) => setDestinationCity(e.target.value)}
                className="w-full glass-input rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
              >
                <option value="Hà Nội">Hà Nội</option>
                <option value="Hồ Chí Minh">TP. Hồ Chí Minh</option>
                <option value="Đà Nẵng">Đà Nẵng</option>
                <option value="Cần Thơ">Cần Thơ</option>
                <option value="Bình Dương">Bình Dương</option>
              </select>
            </div>
          </div>

          {/* Service Type Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase">Gói Dịch Vụ Vận Chuyển</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: 'STANDARD', label: 'Tiêu Chuẩn', desc: 'Tiết kiệm' },
                { id: 'EXPRESS', label: 'Hỏa Tốc', desc: 'Giao nhanh' },
                { id: 'COLD_CHAIN', label: 'Xe Lạnh 2-8°C', desc: 'Dược phẩm' },
                { id: 'HEAVY', label: 'Hàng Nặng', desc: 'Tải trọng lớn' },
              ].map((svc) => (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => setServiceType(svc.id as any)}
                  className={`p-3 rounded-2xl text-left border-2 transition cursor-pointer ${serviceType === svc.id
                      ? 'bg-blue-50/90 border-blue-600 text-blue-900 dark:bg-blue-600/20 dark:border-blue-500 dark:text-white shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 dark:bg-slate-900/60 dark:border-slate-800 dark:text-slate-400 dark:hover:border-slate-700'
                    }`}
                >
                  <div className={`text-xs font-bold ${serviceType === svc.id ? 'text-blue-700 dark:text-white' : 'text-slate-800 dark:text-slate-200'}`}>{svc.label}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{svc.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Weight Input */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Trọng Lượng Thực Tế (kg)</label>
              <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400 font-mono">
                {numWeight > 0 ? `${numWeight} kg` : <span className="text-amber-500 text-xs font-normal">Chưa nhập</span>}
              </span>
            </div>
            <input
              type="number"
              step="any"
              min="0.1"
              placeholder="VD: 3.5"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              className={`w-full glass-input rounded-xl px-4 py-2.5 text-sm font-mono text-slate-900 dark:text-white bg-white dark:bg-slate-900 border transition ${!weightInput.trim() || numWeight <= 0 ? 'border-amber-500/60 bg-amber-50 dark:bg-amber-950/20' : 'border-slate-200 dark:border-slate-700'
                }`}
            />
            {(!weightInput.trim() || numWeight <= 0) && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Vui lòng nhập trọng lượng thực tế lớn hơn 0 kg
              </p>
            )}
          </div>

          {/* Dimensions Input (Length, Width, Height) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Kích Thước Kiện Hàng (Dài x Rộng x Cao cm)</label>
              {(!lengthInput.trim() || !widthInput.trim() || !heightInput.trim() || numLength <= 0 || numWidth <= 0 || numHeight <= 0) && (
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Yêu cầu nhập đủ 3 chiều
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 block mb-1">Dài (cm)</span>
                <input
                  type="number"
                  step="any"
                  min="1"
                  placeholder="40"
                  value={lengthInput}
                  onChange={(e) => setLengthInput(e.target.value)}
                  className={`w-full glass-input rounded-xl px-3 py-2 text-sm font-mono text-center text-slate-900 dark:text-white bg-white dark:bg-slate-900 border transition ${!lengthInput.trim() || numLength <= 0 ? 'border-amber-500/60 bg-amber-50 dark:bg-amber-950/20' : 'border-slate-200 dark:border-slate-700'
                    }`}
                />
              </div>

              <div>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 block mb-1">Rộng (cm)</span>
                <input
                  type="number"
                  step="any"
                  min="1"
                  placeholder="30"
                  value={widthInput}
                  onChange={(e) => setWidthInput(e.target.value)}
                  className={`w-full glass-input rounded-xl px-3 py-2 text-sm font-mono text-center text-slate-900 dark:text-white bg-white dark:bg-slate-900 border transition ${!widthInput.trim() || numWidth <= 0 ? 'border-amber-500/60 bg-amber-50 dark:bg-amber-950/20' : 'border-slate-200 dark:border-slate-700'
                    }`}
                />
              </div>

              <div>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 block mb-1">Cao (cm)</span>
                <input
                  type="number"
                  step="any"
                  min="1"
                  placeholder="25"
                  value={heightInput}
                  onChange={(e) => setHeightInput(e.target.value)}
                  className={`w-full glass-input rounded-xl px-3 py-2 text-sm font-mono text-center text-slate-900 dark:text-white bg-white dark:bg-slate-900 border transition ${!heightInput.trim() || numHeight <= 0 ? 'border-amber-500/60 bg-amber-50 dark:bg-amber-950/20' : 'border-slate-200 dark:border-slate-700'
                    }`}
                />
              </div>
            </div>
          </div>

        </div>

        {/* Right Output Results Panel */}
        <div className="lg:col-span-5 bg-gradient-to-br from-blue-50/90 via-white to-indigo-50/70 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950 p-6 sm:p-7 rounded-3xl border-2 border-blue-200 dark:border-blue-500/30 space-y-5 relative overflow-hidden shadow-md dark:shadow-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>

          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Scale className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
            Kết Quả Dự Tính Cước
          </h3>

          {!isFormValid ? (
            <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/40 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-amber-500 dark:text-amber-400 mx-auto animate-bounce" />
              <div>
                <h4 className="text-sm font-bold text-amber-800 dark:text-amber-200">Chưa Đủ Thông Số Tính Cước</h4>
                <p className="text-xs text-amber-700 dark:text-amber-300/80 mt-1">
                  Vui lòng nhập đầy đủ Trọng lượng thực tế và Kích thước kiện hàng (Dài, Rộng, Cao) để xem kết quả.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Comparison Cards: Actual vs Volumetric */}
              <div className="grid grid-cols-2 gap-3">
                <div className={`p-4 rounded-2xl border-2 transition ${!isVolumetricHigher ? 'bg-white dark:bg-blue-600/20 border-blue-500 shadow-sm' : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'}`}>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mb-1">Trọng Lượng Thực</div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">{numWeight} <span className="text-xs font-normal text-slate-500">kg</span></div>
                  {!isVolumetricHigher && (
                    <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20 px-2 py-0.5 rounded-full">
                      <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Áp dụng tính cước
                    </span>
                  )}
                </div>

                <div className={`p-4 rounded-2xl border-2 transition ${isVolumetricHigher ? 'bg-white dark:bg-cyan-600/20 border-cyan-500 shadow-sm' : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'}`}>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mb-1">Quy Đổi Thể Tích (DIM)</div>
                  <div className="text-2xl font-black text-blue-600 dark:text-cyan-300 font-mono">{volumetricWeightKg} <span className="text-xs font-normal text-slate-500">kg</span></div>
                  {isVolumetricHigher && (
                    <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold text-cyan-800 bg-cyan-100 border border-cyan-300 dark:text-cyan-400 dark:bg-cyan-500/10 dark:border-cyan-500/20 px-2 py-0.5 rounded-full">
                      <Check className="w-3 h-3 text-cyan-600 dark:text-cyan-400" /> Áp dụng tính cước (Lớn hơn)
                    </span>
                  )}
                </div>
              </div>

              {/* Explanatory banner */}
              <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-blue-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5 shadow-sm">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  Trọng lượng tính cước chính thức:{' '}
                  <strong className="text-blue-600 dark:text-cyan-400 font-mono text-sm font-bold">{chargeableWeightKg} kg</strong>.
                  {isVolumetricHigher ? (
                    <span> Kích thước kiện cồng kềnh hơn khối lượng thực tế nên áp dụng quy đổi thể tích.</span>
                  ) : (
                    <span> Khối lượng thực tế lớn hơn thể tích quy đổi.</span>
                  )}
                </div>
              </div>

              {/* Final Estimated Cost Card */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-white space-y-2.5 text-center shadow-xl shadow-blue-600/25">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xs font-bold text-blue-100 uppercase tracking-wider">Tổng Cước Phí Ước Tính</span>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/30">
                    {routeInfo.label}
                  </span>
                </div>
                <div className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tight">
                  {estimatedCost.toLocaleString('vi-VN')} <span className="text-xl font-bold text-blue-200">đ</span>
                </div>
                <p className="text-[11px] text-blue-100/90">
                  Tuyến: <strong className="text-white">{originCity}</strong> ➔ <strong className="text-white">{destinationCity}</strong> (Đã gồm phụ phí nhiên liệu)
                </p>
              </div>

              {/* Action button */}
              {onApplyToNewOrder && (
                <button
                  onClick={() =>
                    onApplyToNewOrder(
                      {
                        weightKg: numWeight,
                        lengthCm: numLength,
                        widthCm: numWidth,
                        heightCm: numHeight,
                        originCity,
                        destinationCity,
                        serviceType,
                      },
                      estimatedCost,
                      chargeableWeightKg
                    )
                  }
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-extrabold text-sm shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer transition transform hover:-translate-y-0.5"
                >
                  <Sparkles className="w-4 h-4 text-emerald-200" />
                  Tạo Đơn Hàng Với Cước Phí Này
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

