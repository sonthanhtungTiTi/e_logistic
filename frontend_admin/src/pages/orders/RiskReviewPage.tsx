import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  ArrowLeft,
  ShieldAlert,
  FileText,
  Download,
  Loader2,
  DollarSign,
  Percent,
  Compass
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router';
import { adminOrderApi } from '../../api/order.api';
import type { Order } from '../../types/order.types';

export const RiskReviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Resolution Form state (Matching Wireframe 4)
  const [selectedHub, setSelectedHub] = useState<string>('HUB_SGN_01');
  const [overrideNote, setOverrideNote] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchOrderDetail = async () => {
      setLoading(true);
      try {
        const response = await adminOrderApi.getOrderById(id);
        if (response.data.success) {
          setOrder(response.data.data);
          if (response.data.data.deliveryHub) {
            setSelectedHub(response.data.data.deliveryHub);
          }
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Không thể tải chi tiết đơn hàng.');
      } finally {
        setLoading(false);
      }
    };
    fetchOrderDetail();
  }, [id]);

  const handleApprove = async () => {
    if (!id) return;
    setSubmitting(true);
    try {
      const response = await adminOrderApi.approveOrder(id, {
        deliveryHub: selectedHub,
        overrideNote: overrideNote || 'Admin đã duyệt đơn hàng và gán bưu cục thủ công.'
      });

      if (response.data.success) {
        setActionSuccessMsg('Đơn hàng đã được duyệt và chuyển sang trạng thái READY_TO_PICK!');
        setTimeout(() => navigate('/admin/orders'), 1500);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Lỗi khi phê duyệt đơn hàng.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    if (!window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này với vai trò Admin?')) return;
    setSubmitting(true);
    try {
      const response = await adminOrderApi.cancelOrder(id, {
        reason: 'OTHER',
        customReason: 'Admin hủy đơn do vi phạm kiểm tra rủi ro tài chính'
      });

      if (response.data.success) {
        setActionSuccessMsg('Đã hủy đơn hàng thành công!');
        setTimeout(() => navigate('/admin/orders'), 1500);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể hủy đơn hàng.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400 mb-2" />
        <span>Đang tải thông tin kiểm tra rủi ro đơn hàng...</span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-12 text-center text-red-400">
        <p>{error || 'Đơn hàng không tồn tại.'}</p>
        <button onClick={() => navigate('/admin/orders')} className="mt-4 px-4 py-2 bg-slate-800 text-slate-200 text-xs font-bold rounded-xl">
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const sellerName = typeof order.sellerId === 'object' ? order.sellerId.fullName || 'Seller' : 'Seller ID: ' + order.sellerId;

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* Breadcrumbs & Header Matching Wireframe 4 */}
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-2 font-mono">
          <button onClick={() => navigate('/admin/orders')} className="hover:text-blue-400 flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Orders
          </button>
          <span>/</span>
          <span className="text-blue-400 font-bold">{order.trackingCode}</span>
          <span>/</span>
          <span className="text-slate-200">Risk Review</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-white tracking-tight">
              Review Order: {order.trackingCode}
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-400 border border-amber-500/30">
              ● {order.status}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => alert('Đã gửi yêu cầu chỉnh sửa cho Seller')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700"
            >
              Request Seller Edit
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs font-bold border border-red-500/30"
            >
              Cancel Order
            </button>
            <button
              onClick={handleApprove}
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30"
            >
              <CheckCircle className="w-4 h-4" /> Approve & Dispatch
            </button>
          </div>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Main Grid: Left Review Cards (8 Cols), Right Resolution Cards (4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT COLUMN */}
        <div className="lg:col-span-8 space-y-6">

          {/* AUTOMATED RISK ENGINE HALT CARD (MATCHING WIREFRAME 4 - RED BORDER) */}
          <div className="bg-red-950/20 border-2 border-red-500/40 rounded-3xl p-6 space-y-4 shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-3 border-b border-red-500/20 pb-3">
              <div className="p-2 rounded-xl bg-red-500/20 text-red-400">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-lg text-white">Automated Risk Engine Halt</h3>
                <p className="text-xs text-red-300">
                  This order triggered severe risk flags during automated validation.
                </p>
              </div>
            </div>

            {/* Risk Sub-Cards */}
            <div className="space-y-3">
              {/* Flag 1: COD Anomaly */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex gap-3">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 h-fit">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-amber-300">COD Anomaly Detected</h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Declared COD amount ({formatCurrency(order.codAmount)}) exceeds normal threshold relative to goods declared value ({formatCurrency(order.goodsValue)}).
                  </p>
                </div>
              </div>

              {/* Flag 2: Fee Ratio Warning */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex gap-3">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 h-fit">
                  <Percent className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-amber-300">Fee Ratio Warning</h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Logistics fee ({formatCurrency(order.shippingFee)}) represents less than standard ratio for medical high-value cargo.
                  </p>
                </div>
              </div>

              {/* Flag 3: Manual Routing Required */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 flex gap-3">
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 h-fit">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-blue-300">Manual Routing Required</h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Destination Hub is operating near capacity. Secondary cold-chain facility must be manually assigned by Admin.
                  </p>
                </div>
              </div>
            </div>

            <div className="text-[10px] font-mono text-slate-500 pt-1">
              RISK ENGINE LOG REF: RE-992-AABBCC. MODEL VER: V4.1.2
            </div>
          </div>

          {/* CONSIGNMENT MANIFEST TABLE (MATCHING WIREFRAME 4) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" /> Consignment Manifest
              </h3>
              <button className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1">
                <Download className="w-3.5 h-3.5" /> Export Full Manifest
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-800">
                    <th className="py-2.5 px-3">Item ID</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Class</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Declared Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {order.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30">
                      <td className="py-3 px-3 text-slate-400 text-[11px]">ITM-00{idx + 1}</td>
                      <td className="py-3 px-3 text-slate-200 font-sans font-bold">{item.name}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          GENERAL_MED
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center text-slate-300">{item.quantity}</td>
                      <td className="py-3 px-3 text-right text-emerald-400 font-bold">
                        {formatCurrency(order.goodsValue || 500000)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-800 pt-3 flex justify-between items-center text-xs font-bold">
              <span className="text-slate-400">Total Declared Value:</span>
              <span className="text-emerald-400 font-mono text-base font-black">
                {formatCurrency(order.goodsValue || 500000)}
              </span>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: RESOLUTION ACTIONS & LOGISTICS META (MATCHING WIREFRAME 4) */}
        <div className="lg:col-span-4 space-y-6">

          {/* RESOLUTION ACTIONS CARD (MATCHING WIREFRAME 4) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl backdrop-blur-sm">
            <h3 className="font-black text-base text-white border-b border-slate-800 pb-3">
              Resolution Actions
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Assign Manual Hub <span className="text-red-400">*</span>
                </label>
                <select
                  value={selectedHub}
                  onChange={(e) => setSelectedHub(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-mono outline-none focus:border-blue-500"
                >
                  <option value="HUB_SGN_01">HUB_SGN_01 (TP. Hồ Chí Minh)</option>
                  <option value="HUB_HAN_01">HUB_HAN_01 (Hà Nội)</option>
                  <option value="HUB_DAD_01">HUB_DAD_01 (Đà Nẵng)</option>
                  <option value="HUB_VTH_01">HUB_VTH_01 (Cần Thơ)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Resolution Notes</label>
                <textarea
                  rows={3}
                  value={overrideNote}
                  onChange={(e) => setOverrideNote(e.target.value)}
                  placeholder="Enter justification for overriding risk flags..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 outline-none focus:border-blue-500 placeholder:text-slate-600"
                />
              </div>

              <button
                type="button"
                onClick={handleApprove}
                disabled={submitting}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Approve & Assign Hub
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => alert('Đã gửi yêu cầu chỉnh sửa!')}
                  className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700"
                >
                  Request Edit
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 font-bold text-xs border border-red-500/30"
                >
                  Cancel Order
                </button>
              </div>
            </div>
          </div>

          {/* LOGISTICS META CARD (MATCHING WIREFRAME 4) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl text-xs">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2">
              LOGISTICS META
            </h3>

            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">SENDER:</span>
                <span className="font-bold text-slate-200 block">{sellerName}</span>
                <span className="text-slate-400 block text-[11px]">{order.pickupAddress.province}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">CONSIGNEE:</span>
                <span className="font-bold text-slate-200 block">{order.deliveryAddress.fullName}</span>
                <span className="text-slate-400 block text-[11px]">{order.deliveryAddress.district}, {order.deliveryAddress.province}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">SERVICE LEVEL:</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 inline-block mt-0.5 font-mono">
                  PRIORITY_COLD_CHAIN
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
