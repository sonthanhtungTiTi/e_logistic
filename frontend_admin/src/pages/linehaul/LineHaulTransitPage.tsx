import React, { useState } from 'react';
import { AlertTriangle, Clock, Radio } from 'lucide-react';

export const LineHaulTransitPage: React.FC = () => {
  const [isGpsActive, setIsGpsActive] = useState<boolean>(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [incidentLogs, setIncidentLogs] = useState([
    { time: '16:15', title: 'Đi qua Trạm thu phí Dầu Giây', type: 'INFO' },
    { time: '14:30', title: 'Dừng nghỉ 20 phút tại Trạm dừng chân Xuân Lộc', type: 'INFO' },
    { time: '12:00', title: 'Xuất bến từ Kho Tổng Sài Gòn (HUB_SGN)', type: 'SUCCESS' },
  ]);

  const handleReportIncident = () => {
    const detail = prompt('Nhập sự cố dọc đường (Hỏng lốp / Tai nạn / Kẹt đèo / Thời tiết xấu):', 'Kẹt xe tại đèo Cù Mông');
    if (!detail) return;

    const newLog = {
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      title: `⚠️ Sự cố: ${detail}`,
      type: 'WARNING',
    };

    setIncidentLogs([newLog, ...incidentLogs]);
    setMsg(`✅ Đã gửi báo cáo sự cố về Trung tâm Điều phối Vận Tải: "${detail}"`);
  };

  return (
    <div className="space-y-4">
      {/* Active Trip Telematics */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-semibold block">Chuyến Xe Đang Chạy</span>
            <h2 className="text-base font-black text-orange-400 font-mono mt-0.5">TRIP-SGN-DAD-01</h2>
          </div>

          <button
            onClick={() => setIsGpsActive(!isGpsActive)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              isGpsActive
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${isGpsActive ? 'animate-pulse' : ''}`} />
            {isGpsActive ? 'GPS Đang Bật' : 'Bật Định Vị'}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center text-xs">
          <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-850">
            <span className="text-[10px] text-slate-500 block">Đã Chạy</span>
            <span className="font-bold text-white">410 km</span>
          </div>
          <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-850">
            <span className="text-[10px] text-slate-500 block">Còn Lại</span>
            <span className="font-bold text-cyan-400">540 km</span>
          </div>
          <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-850">
            <span className="text-[10px] text-slate-500 block">Dự Kiến Đến (ETA)</span>
            <span className="font-bold text-amber-400">06:30 Sáng mai</span>
          </div>
        </div>

        <button
          onClick={handleReportIncident}
          className="w-full py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <AlertTriangle className="w-4 h-4" /> Báo Cáo Sự Cố Dọc Đường
        </button>
      </div>

      {msg && (
        <div className="p-3 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold">
          {msg}
        </div>
      )}

      {/* Incident & Transit Logs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-slate-400" />
          Nhật Ký Hành Trình Vận Chuyển
        </h3>

        <div className="space-y-2">
          {incidentLogs.map((log, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-850 text-xs"
            >
              <span className="font-mono text-[11px] text-slate-400 font-bold shrink-0">{log.time}</span>
              <span
                className={`font-semibold ${
                  log.type === 'WARNING'
                    ? 'text-rose-300'
                    : log.type === 'SUCCESS'
                    ? 'text-emerald-300'
                    : 'text-slate-200'
                }`}
              >
                {log.title}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LineHaulTransitPage;
