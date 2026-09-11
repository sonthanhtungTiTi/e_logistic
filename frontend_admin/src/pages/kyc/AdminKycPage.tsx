import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  X,
  FileText,
  UserCheck,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { adminKycApi } from '@/api/adminKyc.api';
import type { PendingKycItem, KycDetailData } from '@/api/adminKyc.api';
import { toast } from 'sonner';
import { io } from 'socket.io-client';

const buildKycImageUrl = (urlOrFilename: string | undefined | null) => {
  if (!urlOrFilename) return '';
  const token = localStorage.getItem('admin_access_token') || localStorage.getItem('access_token') || '';
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

  let path = urlOrFilename;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    try {
      const parsed = new URL(path);
      path = parsed.pathname;
    } catch {}
  }
  if (!path.startsWith('/api/kyc/files/')) {
    path = `/api/kyc/files/${path.replace(/^\/+/, '')}`;
  }
  return `http://${hostname}:5000${path}?token=${encodeURIComponent(token)}`;
};

export const AdminKycPage: React.FC = () => {
  const [items, setItems] = useState<PendingKycItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  // Review Modal State
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<KycDetailData | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Reject Dialog State
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Zoom Image Lightbox State
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);
  const [zoomedImageTitle, setZoomedImageTitle] = useState('');

  useEffect(() => {
    fetchPendingList();
  }, [page]);

  // Lắng nghe Real-time cập nhật hồ sơ KYC từ Socket.IO
  useEffect(() => {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const socket = io(`http://${hostname}:5000`, { transports: ['websocket'] });

    socket.on('kyc:update', () => {
      fetchPendingList();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchPendingList = async () => {
    setIsLoading(true);
    try {
      const res = await adminKycApi.getPendingList(page, 10);
      if (res.success) {
        setItems(res.data);
        setTotalPages(res.pagination.totalPages);
        setTotalItems(res.pagination.total);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể tải danh sách hồ sơ KYC');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenReview = async (sellerId: string) => {
    setSelectedSellerId(sellerId);
    setIsLoadingDetail(true);
    try {
      const res = await adminKycApi.getDetail(sellerId);
      if (res.success) {
        setDetailData(res.data);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể tải chi tiết hồ sơ KYC');
      setSelectedSellerId(null);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedSellerId) return;
    if (!window.confirm('Bạn có chắc chắn muốn PHÊ DUYỆT hồ sơ KYC này và cấp quyền tạo đơn cho Seller?')) {
      return;
    }

    setIsProcessingAction(true);
    try {
      const res = await adminKycApi.approve(selectedSellerId);
      if (res.success) {
        toast.success('Duyệt hồ sơ KYC thành công!');
        setSelectedSellerId(null);
        setDetailData(null);
        fetchPendingList();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi duyệt hồ sơ');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleOpenRejectDialog = () => {
    setRejectReason('');
    setIsRejectDialogOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedSellerId) return;
    if (!rejectReason.trim() || rejectReason.trim().length < 5) {
      toast.error('Vui lòng nhập lý do từ chối (tối thiểu 5 ký tự)');
      return;
    }

    setIsProcessingAction(true);
    try {
      const res = await adminKycApi.reject(selectedSellerId, rejectReason.trim());
      if (res.success) {
        toast.warning('Đã từ chối hồ sơ KYC và gửi lý do cho Seller');
        setIsRejectDialogOpen(false);
        setSelectedSellerId(null);
        setDetailData(null);
        fetchPendingList();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi từ chối hồ sơ');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Lọc tìm kiếm client-side nhanh trên danh sách hiện tại
  const filteredItems = items.filter(
    (item: PendingKycItem) =>
      item.shopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sellerFullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.phoneNumber.includes(searchTerm) ||
      item.maskedIdNumber.includes(searchTerm)
  );

  return (
    <div className="space-y-6 pb-12">
      {/* TẦNG 1: Page Header & KPI Summary Grid */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Xác Minh Danh Tính (KYC)</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Thẩm định thủ công giấy tờ tùy thân CCCD/CMND 2 mặt trước khi cấp quyền tạo đơn cho Seller
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchPendingList()}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 text-cyan-400 ${isLoading ? 'animate-spin' : ''}`} /> Tải Lại Dữ Liệu
            </button>
          </div>
        </div>

        {/* 4 Thẻ KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Hồ Sơ Chờ Duyệt</span>
              <span className="text-2xl font-black text-amber-400 mt-1 block font-mono">{totalItems}</span>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <FileText className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Trang Hiện Tại</span>
              <span className="text-2xl font-black text-cyan-400 mt-1 block font-mono">{page} / {totalPages}</span>
            </div>
            <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Hồ Sơ Đang Hiển Thị</span>
              <span className="text-2xl font-black text-emerald-400 mt-1 block font-mono">{filteredItems.length}</span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Cảnh Báo Trùng PII</span>
              <span className="text-2xl font-black text-rose-400 mt-1 block font-mono">0</span>
            </div>
            <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* TẦNG 2: Filter & Search Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên shop, người đại diện, SĐT, số CCCD..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition"
          />
        </div>

        <span className="text-xs text-slate-400 font-medium">
          Hiển thị <strong className="text-white font-bold">{filteredItems.length}</strong> / {totalItems} hồ sơ
        </span>
      </div>

      {/* Main Table */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-900/50 text-[11px] text-slate-400 uppercase font-bold tracking-wider">
                <th className="py-4 px-5">Tên Shop / Doanh Nghiệp</th>
                <th className="py-4 px-4">Người Đại Diện & SĐT</th>
                <th className="py-4 px-4">Loại Giấy Tờ</th>
                <th className="py-4 px-4 font-mono">Số Định Danh (Đã Che PII)</th>
                <th className="py-4 px-4">Thời Gian Nộp</th>
                <th className="py-4 px-4 text-center">Cảnh Báo Trùng Lặp</th>
                <th className="py-4 px-5 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-400 mb-2" />
                    Đang tải danh sách hồ sơ KYC...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400/60 mx-auto mb-2" />
                    Không có hồ sơ KYC nào đang chờ duyệt lúc này.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item: PendingKycItem) => (
                  <tr key={item._id} className="hover:bg-slate-800/40 transition group">
                    <td className="py-4 px-5">
                      <div className="font-bold text-white group-hover:text-cyan-400 transition">
                        {item.shopName}
                      </div>
                      <span className="text-[11px] text-slate-400 block truncate max-w-xs">{item.email}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-slate-200 font-semibold">{item.sellerFullName}</div>
                      <span className="text-[11px] text-cyan-400 font-mono">{item.phoneNumber}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 font-bold text-[10px] text-slate-300">
                        {item.idType}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-mono font-bold text-slate-300">
                      {item.maskedIdNumber}
                    </td>
                    <td className="py-4 px-4 text-slate-400">
                      <div>{new Date(item.submittedAt).toLocaleDateString('vi-VN')}</div>
                      <span className="text-[10px] text-slate-500">
                        {new Date(item.submittedAt).toLocaleTimeString('vi-VN')}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {item.duplicateIdWarning ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[10px] font-bold">
                          <AlertTriangle className="w-3 h-3 text-blue-400 shrink-0" />
                          Trùng {item.duplicateCount} shop
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">— Duy nhất —</span>
                      )}
                    </td>
                    <td className="py-4 px-5 text-right">
                      <button
                        onClick={() => handleOpenReview(item.sellerId)}
                        className="px-3.5 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 text-xs font-bold flex items-center gap-1.5 ml-auto transition shadow-sm cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Thẩm Định
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Trang <strong className="text-white font-bold">{page}</strong> / {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p: number) => Math.max(p - 1, 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p: number) => Math.min(p + 1, totalPages))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Review & Detail Modal */}
      {selectedSellerId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel rounded-3xl border border-slate-700 max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Thẩm Định Hồ Sơ Xác Minh KYC</h3>
                  <p className="text-[11px] text-slate-400">
                    Đối chiếu thông tin giấy tờ tùy thân với tài khoản người bán
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedSellerId(null);
                  setDetailData(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {isLoadingDetail || !detailData ? (
                <div className="py-16 text-center text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-cyan-400 mb-3" />
                  Đang tải hồ sơ và hình ảnh tài liệu bảo mật...
                </div>
              ) : (
                <>
                  {/* Duplicate ID Warning Banner */}
                  {detailData.duplicateIdWarning && (
                    <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-500/50 text-blue-200 space-y-2">
                      <div className="flex items-center gap-2 font-bold text-blue-300">
                        <AlertTriangle className="w-4 h-4 text-blue-400" />
                        CẢNH BÁO: Số định danh này đang trùng với {detailData.duplicateShops?.length || 0} tài khoản khác!
                      </div>
                      <p className="text-[11px] text-slate-300">
                        Vui lòng kiểm tra xem đây có phải là cùng một chủ thể mở nhiều gian hàng hay có dấu hiệu mượn/giả mạo giấy tờ:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                        {detailData.duplicateShops?.map((s: any, idx: number) => (
                          <div key={idx} className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                            <span>{s.shopName} ({s.phoneNumber})</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-cyan-300">
                              {s.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Seller Profile Summary */}
                  <div className="p-5 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] block font-semibold">Tên Cửa Hàng / Công Ty</span>
                      <strong className="text-slate-900 dark:text-white text-sm block font-bold">{detailData.sellerId?.companyName || 'N/A'}</strong>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">MST/GPKD: {detailData.sellerId?.taxCode || 'Chưa có'}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] block font-semibold">Họ Tên & SĐT Đăng Ký</span>
                      <strong className="text-slate-900 dark:text-slate-200 block font-bold">{detailData.sellerId?.fullName}</strong>
                      <span className="text-[11px] text-cyan-600 dark:text-cyan-400 font-mono block font-bold">{detailData.sellerId?.phoneNumber}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] block font-semibold">Địa Chỉ Đăng Ký Shop</span>
                      <span className="text-slate-800 dark:text-slate-300 block truncate font-medium">{detailData.sellerId?.address || 'Chưa cập nhật'}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Loại hình: {detailData.sellerId?.businessType || 'COMPANY'}</span>
                    </div>
                  </div>

                  {/* Identity Verification Match Panel */}
                  <div className="p-5 rounded-2xl bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-300 dark:border-cyan-500/30 space-y-3">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                      <FileText className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /> Thông Tin Giấy Tờ Seller Khai Báo
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <span className="text-slate-500 dark:text-slate-400 text-[11px] block font-semibold">Loại Giấy Tờ</span>
                        <strong className="text-slate-900 dark:text-white text-sm font-black">{detailData.idType || 'CCCD'}</strong>
                      </div>
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <span className="text-slate-500 dark:text-slate-400 text-[11px] block font-semibold">Số Định Danh Thật (Unmasked)</span>
                        <strong className="text-cyan-700 dark:text-cyan-300 font-mono text-sm tracking-wider font-black">{detailData.idNumber}</strong>
                      </div>
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <span className="text-slate-500 dark:text-slate-400 text-[11px] block font-semibold">Họ Tên Trên Giấy Tờ</span>
                        <strong className="text-blue-700 dark:text-blue-300 uppercase tracking-wide font-black">{detailData.idFullName}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Side-by-Side Photos */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">Hình Ảnh Tài Liệu (Bấm vào ảnh để phóng to kiểm tra)</h4>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <ZoomIn className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Bấm để xem kích thước gốc
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Front Card */}
                      <div className="space-y-2">
                        <span className="text-slate-700 dark:text-slate-300 font-bold text-xs block">
                          Mặt Trước {detailData.idType}
                        </span>
                        <div
                          onClick={() => {
                            setZoomedImageUrl(buildKycImageUrl(detailData.idFrontImageUrl));
                            setZoomedImageTitle(`Mặt Trước ${detailData.idType} - ${detailData.idFullName}`);
                          }}
                          className="group relative aspect-[4/3] rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center cursor-pointer hover:border-cyan-500 transition shadow-md"
                        >
                          <img
                            src={buildKycImageUrl(detailData.idFrontImageUrl)}
                            alt="Mặt trước"
                            className="w-full h-full object-contain group-hover:scale-105 transition duration-300"
                            onError={() => {
                              console.error('Failed to load front image:', detailData.idFrontImageUrl);
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 text-white font-bold transition">
                            <ZoomIn className="w-5 h-5 text-cyan-400" /> Phóng To
                          </div>
                        </div>
                      </div>

                      {/* Back Card */}
                      <div className="space-y-2">
                        <span className="text-slate-700 dark:text-slate-300 font-bold text-xs block">
                          Mặt Sau {detailData.idType}
                        </span>
                        <div
                          onClick={() => {
                            setZoomedImageUrl(buildKycImageUrl(detailData.idBackImageUrl));
                            setZoomedImageTitle(`Mặt Sau ${detailData.idType} - ${detailData.idFullName}`);
                          }}
                          className="group relative aspect-[4/3] rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center cursor-pointer hover:border-cyan-500 transition shadow-md"
                        >
                          <img
                            src={buildKycImageUrl(detailData.idBackImageUrl)}
                            alt="Mặt sau"
                            className="w-full h-full object-contain group-hover:scale-105 transition duration-300"
                            onError={() => {
                              console.error('Failed to load back image:', detailData.idBackImageUrl);
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 text-white font-bold transition">
                            <ZoomIn className="w-5 h-5 text-cyan-400" /> Phóng To
                          </div>
                        </div>
                      </div>

                      {/* Business License if exists */}
                      {detailData.businessLicenseImageUrl && (
                        <div className="space-y-2 md:col-span-2">
                          <span className="text-slate-700 dark:text-slate-300 font-bold text-xs block">
                            Giấy Phép Đăng Ký Kinh Doanh (GPKD)
                          </span>
                          <div
                            onClick={() => {
                              setZoomedImageUrl(buildKycImageUrl(detailData.businessLicenseImageUrl));
                              setZoomedImageTitle(`Giấy Phép ĐKKD - ${detailData.sellerId?.companyName || detailData.idFullName}`);
                            }}
                            className="group relative h-64 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center cursor-pointer hover:border-cyan-500 transition shadow-md"
                          >
                            <img
                              src={buildKycImageUrl(detailData.businessLicenseImageUrl)}
                              alt="GPKD"
                              className="w-full h-full object-contain group-hover:scale-105 transition duration-300"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 text-white font-bold transition">
                              <ZoomIn className="w-5 h-5 text-cyan-400" /> Phóng To
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setSelectedSellerId(null);
                  setDetailData(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer transition"
              >
                Đóng
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={isProcessingAction || isLoadingDetail}
                  onClick={handleOpenRejectDialog}
                  className="px-5 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 font-bold text-xs flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" /> Từ Chối Hồ Sơ
                </button>

                <button
                  type="button"
                  disabled={isProcessingAction || isLoadingDetail}
                  onClick={handleApprove}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition cursor-pointer disabled:opacity-50"
                >
                  {isProcessingAction ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Đang Xử Lý...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Phê Duyệt KYC
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Confirmation Dialog */}
      {isRejectDialogOpen && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-3xl border border-rose-500/40 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-400" /> Lý Do Từ Chối Hồ Sơ KYC
              </h3>
              <button
                onClick={() => setIsRejectDialogOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Vui lòng cung cấp lý do cụ thể để người bán biết và nộp lại ảnh giấy tờ hợp lệ:
            </p>

            <textarea
              required
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ví dụ: Ảnh mặt sau CCCD bị mờ, không rõ số căn cước và ngày cấp; hoặc họ tên khai báo không khớp trên giấy tờ..."
              className="w-full glass-input rounded-xl p-3 text-xs text-white placeholder:text-slate-500 focus:border-rose-500"
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsRejectDialogOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isProcessingAction}
                onClick={handleConfirmReject}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                {isProcessingAction ? 'Đang gửi...' : 'Xác Nhận Từ Chối'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Image Lightbox Zoom Modal */}
      {zoomedImageUrl && (
        <div
          onClick={() => setZoomedImageUrl(null)}
          className="fixed inset-0 z-70 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-5xl max-h-[95vh] rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 p-2 shadow-2xl flex flex-col"
          >
            <div className="p-3 flex items-center justify-between border-b border-slate-800 text-xs text-slate-300 font-bold">
              <span>{zoomedImageTitle}</span>
              <button
                onClick={() => setZoomedImageUrl(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 overflow-auto flex items-center justify-center flex-1 max-h-[85vh]">
              <img
                src={zoomedImageUrl}
                alt="Phóng to"
                className="max-h-[80vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminKycPage;
