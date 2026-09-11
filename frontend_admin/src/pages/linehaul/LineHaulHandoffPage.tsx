import React, { useState } from 'react';
import { CameraScanner } from '@/components/driver/CameraScanner';
import { ClipboardCheck, Boxes, Building2 } from 'lucide-react';
import { axiosClient } from '@/api/axiosClient';

export const LineHaulHandoffPage: React.FC = () => {
  const [manualCode, setManualCode] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [handoffMode, setHandoffMode] = useState<'RECEIVE_ORIGIN' | 'DELIVER_DEST'>('RECEIVE_ORIGIN');
  const [sealCondition, setSealCondition] = useState<'INTACT' | 'DAMAGED' | 'TORN_SEAL'>('INTACT');
  const [loading, setLoading] = useState<boolean>(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleScanHandoff = async (code: string) => {
    if (!code) return;
    setLoading(true);

    try {
      const transferType = handoffMode === 'RECEIVE_ORIGIN' ? 'ORIGIN_HUB_TO_LINEHAUL' : 'LINEHAUL_TO_DEST_HUB';

      await axiosClient.post('/custody/transfer', {
        trackingCode: code.toUpperCase(),
        transferType,
        handoverCode: code.toUpperCase(),
        packageCondition: sealCondition,
      });

      setMsg({
        type: 'success',
        text: `✅ Đã quét bàn giao [${code}] thành công (${handoffMode === 'RECEIVE_ORIGIN' ? 'Nhận từ Kho Xuất' : 'Giao cho Kho Đích'}) & ghi nhận Chain of Custody!`,
      });
      setManualCode('');
    } catch (err: any) {
      setMsg({
        type: 'error',
        text: err.response?.data?.message || `Lỗi quét bàn giao mã [${code}]`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between">
        <div>
          <h2 className="font-bold text-sm text-white flex items-center gap-1.5">
            <ClipboardCheck className="w-4 h-4 text-blue-400" />
            Quét Bàn Giao Niêm Phong (Chain of Custody)
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">Xác nhận 2 chiều với Nhân viên kho tại cổng xuất/nhập</p>
        </div>
        <span className="text-[10px] bg-blue-500/20 text-blue-300 font-bold px-2 py-1 rounded-lg border border-blue-500/30 font-mono">
          Xe Tải
        </span>
      </div>

      {/* Mode Switcher */}
      <div className="grid grid-cols-2 gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
        <button
          onClick={() => setHandoffMode('RECEIVE_ORIGIN')}
          className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            handoffMode === 'RECEIVE_ORIGIN'
              ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Boxes className="w-4 h-4" /> 1. Nhận Tại Kho Xuất
        </button>

        <button
          onClick={() => setHandoffMode('DELIVER_DEST')}
          className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            handoffMode === 'DELIVER_DEST'
              ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Building2 className="w-4 h-4" /> 2. Bàn Giao Kho Đích
        </button>
      </div>

      {msg && (
        <div
          className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between ${
            msg.type === 'success'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
          }`}
        >
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Condition Check Selector */}
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl space-y-2 text-xs">
        <span className="text-slate-300 font-semibold block">Tình Trạng Niêm Phong / Seal:</span>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setSealCondition('INTACT')}
            className={`py-1.5 rounded-lg font-bold border transition text-center ${
              sealCondition === 'INTACT'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-950 text-slate-400 border-slate-800'
            }`}
          >
            Nguyên Vẹn
          </button>
          <button
            onClick={() => setSealCondition('DAMAGED')}
            className={`py-1.5 rounded-lg font-bold border transition text-center ${
              sealCondition === 'DAMAGED'
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                : 'bg-slate-950 text-slate-400 border-slate-800'
            }`}
          >
            Móp Méo
          </button>
          <button
            onClick={() => setSealCondition('TORN_SEAL')}
            className={`py-1.5 rounded-lg font-bold border transition text-center ${
              sealCondition === 'TORN_SEAL'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-slate-950 text-slate-400 border-slate-800'
            }`}
          >
            Rách Niêm Phong
          </button>
        </div>
      </div>

      {/* Camera QR Scanner */}
      <CameraScanner
        onScanSuccess={handleScanHandoff}
        isScanning={isCameraActive}
        onToggleScan={setIsCameraActive}
      />

      {/* Manual Input */}
      <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl space-y-2.5">
        <label className="text-xs font-semibold text-slate-300 block">Hoặc nhập mã Trip / Mã Bao Seal:</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value.toUpperCase())}
            placeholder="VD: SEAL-SG-DAD-881..."
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs uppercase font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={() => handleScanHandoff(manualCode)}
            disabled={loading || !manualCode.trim()}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition disabled:opacity-50 cursor-pointer"
          >
            Xác Nhận
          </button>
        </div>
      </div>
    </div>
  );
};

export default LineHaulHandoffPage;
