import React, { useState } from 'react';
import { CameraScanner } from '@/components/driver/CameraScanner';
import { outboundApi } from '@/api/outbound.api';
import { ClipboardCheck, CheckCircle2, XCircle, AlertTriangle, Send, History, Truck } from 'lucide-react';

export const DriverHandoffPage: React.FC = () => {
  const [manualTripCode, setManualTripCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pendingTrip, setPendingTrip] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const handleScanTrip = (tripCode: string) => {
    const code = tripCode.trim().toUpperCase();
    if (!code) return;
    setPendingTrip(code);
    setManualTripCode('');
    setStatusMsg({ type: 'success', text: `ℹ️ Chuyến xe [${code}] đang chờ xác nhận` });
  };

  const handleAccept = async () => {
    if (!pendingTrip || loading) return;
    setLoading(true);
    try {
      const res = await outboundApi.driverConfirmTrip(pendingTrip, { action: 'ACCEPT' });
      setStatusMsg({ type: 'success', text: `✅ Đã chấp nhận chuyến xe [${pendingTrip}]` });
      setHistory(prev => [res.data, ...prev]);
      setPendingTrip(null);
      setShowReject(false);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.response?.data?.message || `❌ Lỗi chấp nhận chuyến xe` });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!pendingTrip || loading) return;
    if (!rejectReason.trim()) {
      setStatusMsg({ type: 'error', text: 'Vui lòng nhập lý do từ chối' });
      return;
    }
    setLoading(true);
    try {
      const res = await outboundApi.driverConfirmTrip(pendingTrip, { action: 'REJECT', reject_reason: rejectReason });
      setStatusMsg({ type: 'error', text: `❌ Đã từ chối chuyến xe [${pendingTrip}]` });
      setHistory(prev => [res.data, ...prev]);
      setPendingTrip(null);
      setShowReject(false);
      setRejectReason('');
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.response?.data?.message || `❌ Lỗi từ chối` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-3 max-w-md mx-auto min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 pb-20">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl shadow-sm flex items-center justify-between">
        <div>
          <h2 className="font-bold text-sm text-white flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-orange-400" />
            Nhận Chuyến Xe (Handoff)
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
            <Truck className="w-3 h-3 text-orange-400" /> Quét Trip Code — Chấp nhận hoặc Từ chối
          </p>
        </div>
        <span className="text-[10px] bg-orange-500/20 text-orange-300 font-bold px-2 py-1 rounded-lg border border-orange-500/30">
          UC-17
        </span>
      </div>

      {/* Camera QR Scanner */}
      <CameraScanner
        onScanSuccess={handleScanTrip}
        isScanning={isCameraActive}
        onToggleScan={setIsCameraActive}
      />

      {/* Manual input */}
      <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl shadow-sm space-y-2">
        <label className="text-xs font-semibold text-slate-300 block">Hoặc nhập thủ công mã chuyến xe:</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={manualTripCode}
            onChange={e => setManualTripCode(e.target.value.toUpperCase())}
            onKeyDown={e => { if (e.key === 'Enter') handleScanTrip(manualTripCode); }}
            placeholder="VD: TRIP-178678..."
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm uppercase font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
          />
          <button
            onClick={() => handleScanTrip(manualTripCode)}
            disabled={loading || !manualTripCode.trim()}
            className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0 flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" /> Nhận
          </button>
        </div>
      </div>

      {/* Confirm / Reject panel */}
      {pendingTrip && (
        <div className="bg-orange-950/20 border border-orange-700/40 p-4 rounded-2xl space-y-3">
          <p className="text-xs font-bold text-orange-300">
            Chuyến xe: <span className="font-mono text-white">{pendingTrip}</span>
          </p>
          {!showReject ? (
            <div className="flex gap-3">
              <button
                onClick={handleAccept}
                disabled={loading}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                {loading ? 'Đang xử lý...' : 'Chấp nhận'}
              </button>
              <button
                onClick={() => setShowReject(true)}
                disabled={loading}
                className="flex-1 py-3 bg-rose-700 hover:bg-rose-600 text-white font-bold text-sm rounded-xl transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                <XCircle className="w-4 h-4" /> Từ chối
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-rose-300 block">Lý do từ chối (bắt buộc):</label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                rows={3}
                placeholder="Mô tả lý do..."
                className="w-full bg-slate-950 border border-rose-600/50 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-rose-500 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleReject}
                  disabled={loading || !rejectReason.trim()}
                  className="flex-1 py-2.5 bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs rounded-xl transition disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Đang gửi...' : 'Xác nhận Từ chối'}
                </button>
                <button
                  onClick={() => setShowReject(false)}
                  className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded-xl transition cursor-pointer"
                >
                  Huỷ
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status message */}
      {statusMsg && (
        <div className={`p-3 rounded-xl text-xs font-semibold flex items-start gap-2 border shadow-md ${
          statusMsg.type === 'success'
            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
            : 'bg-rose-950/80 text-rose-300 border-rose-800'
        }`}>
          {statusMsg.type === 'success'
            ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            : <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* History */}
      <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl shadow-sm flex-1 flex flex-col min-h-[120px]">
        <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 mb-2">
          <History className="w-3.5 h-3.5 text-orange-400" />
          Lịch sử xác nhận ({history.length})
        </h3>
        {history.length === 0 ? (
          <div className="text-center py-4 text-slate-500 text-xs italic">
            Chưa xác nhận chuyến xe nào.
          </div>
        ) : (
          <div className="space-y-1.5 overflow-y-auto flex-1 pr-0.5">
            {history.map((item, idx) => (
              <div
                key={idx}
                className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs flex justify-between items-center transition hover:border-slate-700"
              >
                <div>
                  <p className="font-mono font-bold text-orange-400">{item.trip_code || item.tripCode}</p>
                  <p className="text-slate-400 text-[10px] mt-0.5">
                    {item.action === 'ACCEPT'
                      ? `✅ ${item.items_confirmed || 0} kiện → ${item.new_order_status || 'IN_TRANSIT'}`
                      : `❌ ${item.reject_reason || 'Từ chối'}`}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${
                  item.action === 'ACCEPT'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                }`}>
                  {item.action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverHandoffPage;
