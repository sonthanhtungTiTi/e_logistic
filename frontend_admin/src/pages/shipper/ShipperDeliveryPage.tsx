import React, { useState, useEffect } from 'react';
import { PackageCheck, Phone, MapPin, DollarSign, RefreshCw, CheckCircle2, Barcode, History } from 'lucide-react';
import { axiosClient } from '@/api/axiosClient';

interface DeliveryTask {
  _id: string;
  id: string;
  trackingCode: string;
  buyerName: string;
  phone: string;
  address: string;
  subZone?: string;
  ward?: string;
  district?: string;
  province?: string;
  itemsCount: number;
  codAmount: number;
  isCod: boolean;
  status: string;
  deliveryTripId?: string;
  createdAt: string;
}

interface DeliveredHistoryTask {
  _id: string;
  id: string;
  trackingCode: string;
  buyerName: string;
  phone: string;
  address: string;
  declaredWeight: number;
  codAmount: number;
  isCod: boolean;
  status: string;
  deliveredAt: string;
  deliveryTripId?: string;
  createdAt: string;
}

export const ShipperDeliveryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'PENDING' | 'HISTORY'>('PENDING');
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchingTasks, setFetchingTasks] = useState<boolean>(true);
  const [fetchingHistory, setFetchingHistory] = useState<boolean>(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deliveryTasks, setDeliveryTasks] = useState<DeliveryTask[]>([]);
  const [deliveryHistory, setDeliveryHistory] = useState<DeliveredHistoryTask[]>([]);
  const [currentTripId, setCurrentTripId] = useState<string>('');
  const [shipperArea, setShipperArea] = useState<any>(null);

  useEffect(() => {
    loadDeliveryTasks();
    loadDeliveryHistory();
  }, []);

  const loadDeliveryTasks = async () => {
    setFetchingTasks(true);
    try {
      const res = await axiosClient.get('/orders/shipper/delivery-tasks');
      if (res.data?.data) {
        setDeliveryTasks(res.data.data);
        if (res.data.currentTripId) setCurrentTripId(res.data.currentTripId);
        if (res.data.shipperArea) setShipperArea(res.data.shipperArea);
      }
    } catch (err) {
      console.warn('Lỗi tải danh sách đơn giao:', err);
    } finally {
      setFetchingTasks(false);
    }
  };

  const loadDeliveryHistory = async () => {
    setFetchingHistory(true);
    try {
      const res = await axiosClient.get('/orders/shipper/delivery-history');
      if (res.data?.data) {
        setDeliveryHistory(res.data.data);
        if (res.data.currentTripId && !currentTripId) setCurrentTripId(res.data.currentTripId);
      }
    } catch (err) {
      console.warn('Lỗi tải lịch sử giao hàng:', err);
    } finally {
      setFetchingHistory(false);
    }
  };

  const handleCompleteDelivery = async (trackingCode: string, codAmount: number) => {
    setLoading(true);
    try {
      const codeUpper = trackingCode.trim().toUpperCase();

      // Chain of Custody / Delivery Completion
      await axiosClient.post('/custody/transfer', {
        trackingCode: codeUpper,
        transferType: 'SHIPPER_TO_BUYER',
        actualCod: codAmount,
        packageCondition: 'INTACT',
      });

      setMsg({
        type: 'success',
        text: `✅ Đã giao thành công đơn [${codeUpper}]! Thu tiền COD: ${codAmount.toLocaleString('vi-VN')} đ`,
      });
      loadDeliveryTasks();
      loadDeliveryHistory();
    } catch (err: any) {
      setMsg({
        type: 'error',
        text: err.response?.data?.message || `Lỗi hoàn tất giao hàng [${trackingCode}]`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFailDelivery = async (trackingCode: string, orderId: string) => {
    const reason = prompt(
      'Nhập lý do giao thất bại (Khách hẹn lại / Không nghe máy / Sai địa chỉ / Khách từ chối):',
      'CANNOT_CONTACT'
    );
    if (!reason) return;

    try {
      await axiosClient.post(`/orders/${orderId}/delivery-failure`, {
        reasonGroup: reason.includes('REFUSED') ? 'CUSTOMER_REFUSED' : 'CANNOT_CONTACT',
        note: reason,
        contactAttempts: 2,
      });

      setMsg({
        type: 'error',
        text: `⚠️ Đã ghi nhận giao thất bại đơn [${trackingCode}]: "${reason}". Chuyển trạng thái sang Giao Lại.`,
      });
      loadDeliveryTasks();
      loadDeliveryHistory();
    } catch (err: any) {
      setMsg({
        type: 'error',
        text: err.response?.data?.message || `Lỗi báo giao thất bại [${trackingCode}]`,
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-bold text-sm text-white flex items-center gap-1.5">
              <PackageCheck className="w-4 h-4 text-cyan-400" />
              Nhiệm Vụ Giao Hàng Cho Khách (Last-Mile)
            </h2>
            {currentTripId && (
              <span className="text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                <Barcode className="w-3 h-3" /> Chuyến Giao: {currentTripId}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Khu vực giao:{' '}
            <strong className="text-cyan-400">
              {shipperArea?.subZone ? `${shipperArea.subZone}, ` : ''}{shipperArea?.district || ''}{' '}
              {shipperArea?.province || 'Hà Nội'}
            </strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              loadDeliveryTasks();
              loadDeliveryHistory();
            }}
            title="Làm mới danh sách"
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${fetchingTasks || fetchingHistory ? 'animate-spin' : ''}`} />
          </button>
          <span className="text-[10px] bg-cyan-500/20 text-cyan-300 font-bold px-2.5 py-1 rounded-lg border border-cyan-500/30 font-mono">
            {deliveryTasks.length} đơn cần giao
          </span>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-2xl">
        <button
          onClick={() => setActiveTab('PENDING')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'PENDING'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <PackageCheck className="w-3.5 h-3.5" />
          Cần Đi Giao ({deliveryTasks.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('HISTORY');
            loadDeliveryHistory();
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'HISTORY'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          Đã Giao Hôm Nay ({deliveryHistory.length})
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
          <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-white px-1 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* TAB 1: PENDING DELIVERY */}
      {activeTab === 'PENDING' && (
        <div className="space-y-2.5">
          {fetchingTasks ? (
            <div className="p-6 text-center text-slate-500 text-xs space-y-1">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-cyan-400" />
              <p>Đang tải danh sách đơn giao tại khu vực...</p>
            </div>
          ) : deliveryTasks.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-center space-y-1 text-slate-400">
              <CheckCircle2 className="w-8 h-8 text-cyan-400 mx-auto opacity-70" />
              <p className="text-xs font-bold text-white">Chưa có đơn hàng nào cần giao tại khu vực này</p>
              <p className="text-[11px] text-slate-500">Đơn hàng đang trung chuyển từ kho gốc tới kho đích.</p>
            </div>
          ) : (
            deliveryTasks.map((task) => (
              <div key={task.id || task._id} className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl space-y-2.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-white">{task.trackingCode}</span>
                    <span className="text-[9px] bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                      <Barcode className="w-2.5 h-2.5 text-cyan-400" />
                      {task.deliveryTripId || currentTripId}
                    </span>
                  </div>
                  <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded font-mono font-semibold">
                    {task.subZone || task.ward || 'Khu vực giao'}
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-xs">{task.buyerName}</h3>
                    {task.isCod ? (
                      <span className="text-xs font-black text-emerald-400 flex items-center gap-0.5">
                        <DollarSign className="w-3.5 h-3.5" />
                        COD: {task.codAmount.toLocaleString('vi-VN')} đ
                      </span>
                    ) : (
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-semibold">
                        Đã thanh toán trước
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 flex items-start gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                    <span>{task.address}</span>
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <a
                    href={`tel:${task.phone}`}
                    className="text-[11px] font-bold text-cyan-400 flex items-center gap-1 hover:underline"
                  >
                    <Phone className="w-3 h-3" /> Gọi: {task.phone}
                  </a>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleFailDelivery(task.trackingCode, task._id || task.id)}
                      disabled={loading}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-[11px] transition disabled:opacity-50 cursor-pointer"
                    >
                      Giao Thất Bại
                    </button>
                    <button
                      onClick={() => handleCompleteDelivery(task.trackingCode, task.codAmount)}
                      disabled={loading}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition shadow disabled:opacity-50 cursor-pointer"
                    >
                      Giao Thành Công
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: HISTORY DELIVERED */}
      {activeTab === 'HISTORY' && (
        <div className="space-y-3">
          <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Đơn Đã Giao Trong Ca</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Đã phát thành công <strong className="text-cyan-400">{deliveryHistory.length}</strong> đơn trong Chuyến{' '}
                  <span className="font-mono text-white font-bold">[{currentTripId || 'DLV-ACTIVE'}]</span>
                </p>
              </div>
            </div>
            <button
              onClick={loadDeliveryHistory}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${fetchingHistory ? 'animate-spin' : ''}`} />
              Cập nhật
            </button>
          </div>

          <div className="space-y-2.5">
            {fetchingHistory ? (
              <div className="p-8 text-center text-slate-500 text-xs space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-400" />
                <p>Đang tải lịch sử đơn đã giao...</p>
              </div>
            ) : deliveryHistory.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center space-y-1.5 text-slate-400">
                <History className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-xs font-bold text-white">Chưa có đơn hàng nào được giao xong trong ca này</p>
                <p className="text-[11px] text-slate-500">Hãy chuyển sang tab "Cần Đi Giao" để tiến hành giao hàng.</p>
              </div>
            ) : (
              deliveryHistory.map((item) => (
                <div
                  key={item.id || item._id}
                  className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl space-y-2.5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-cyan-400">{item.trackingCode}</span>
                      <span className="text-[9px] bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                        <Barcode className="w-2.5 h-2.5 text-cyan-400" />
                        {item.deliveryTripId || currentTripId}
                      </span>
                    </div>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold">
                      {item.status}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-white text-xs">{item.buyerName}</h4>
                    <p className="text-[11px] text-slate-400 flex items-start gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      <span>{item.address}</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800 font-mono">
                    <span className="text-emerald-400 font-bold">
                      COD: {item.codAmount ? item.codAmount.toLocaleString('vi-VN') : 0} đ
                    </span>
                    <span className="text-slate-500">
                      Giao lúc: {item.deliveredAt ? new Date(item.deliveredAt).toLocaleTimeString('vi-VN') : 'Hôm nay'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ShipperDeliveryPage;
