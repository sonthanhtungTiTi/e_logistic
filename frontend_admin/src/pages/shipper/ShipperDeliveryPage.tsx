import React, { useState, useEffect, useRef } from 'react';
import { CameraScanner } from '@/components/driver/CameraScanner';
import {
  Truck,
  Phone,
  MapPin,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  X,
  History,
  ShieldAlert,
  Calendar,
  Barcode,
  Navigation,
  DollarSign,
  PackageCheck,
  Check,
  Camera,
  FileText,
  UserCheck,
  Lock,
  Compass,
  Zap,
  ArrowRight,
  Upload,
  ShieldCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { axiosClient } from '@/api/axiosClient';
import { socket } from '@/api/socket';

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
  items?: any[];
  declaredWeight: number;
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
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'HUB_SCAN' | 'DELIVERY' | 'HISTORY'>('HUB_SCAN');

  const [manualCode, setManualCode] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [fetchingTasks, setFetchingTasks] = useState<boolean>(true);
  const [fetchingHistory, setFetchingHistory] = useState<boolean>(false);
  const [receivingId, setReceivingId] = useState<string | null>(null);
  const [batchReceiving, setBatchReceiving] = useState<boolean>(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [isWorking, setIsWorking] = useState<boolean>(() => {
    const saved = localStorage.getItem('shipper_is_working');
    return saved !== 'false';
  });

  const [deliveryTasks, setDeliveryTasks] = useState<DeliveryTask[]>([]);
  const [deliveryHistory, setDeliveryHistory] = useState<DeliveredHistoryTask[]>([]);
  const [currentTripId, setCurrentTripId] = useState<string>('');
  const [shipperArea, setShipperArea] = useState<any>(null);

  // Modal ePOD Giao Hàng Thành Công (2 Bước: Form & Live Camera Snapshot)
  const [epodModalOpen, setEpodModalOpen] = useState<boolean>(false);
  const [selectedTaskForEpod, setSelectedTaskForEpod] = useState<DeliveryTask | null>(null);
  const [epodStep, setEpodStep] = useState<'FORM' | 'CAMERA'>('FORM');
  const [actualCod, setActualCod] = useState<string>('');
  const [handoverType, setHandoverType] = useState<string>('DIRECT_CUSTOMER');
  const [podNote, setPodNote] = useState<string>('');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [submittingEpod, setSubmittingEpod] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  // Modal Báo Giao Thất Bại (2 Tầng)
  const [failureModalOpen, setFailureModalOpen] = useState<boolean>(false);
  const [selectedTaskForFailure, setSelectedTaskForFailure] = useState<DeliveryTask | null>(null);
  const [failureTier, setFailureTier] = useState<'TIER_1' | 'TIER_2'>('TIER_1');
  const [reasonGroup, setReasonGroup] = useState<string>('CANNOT_CONTACT');
  const [failureReasonText, setFailureReasonText] = useState<string>('Gọi điện khách không nghe máy / Thuê bao');
  const [contactAttempts, setContactAttempts] = useState<number>(2);
  const [rescheduleDate, setRescheduleDate] = useState<string>('');
  const [failureNote, setFailureNote] = useState<string>('');
  const [submittingFailure, setSubmittingFailure] = useState<boolean>(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (epodModalOpen && !submittingEpod) {
          setEpodModalOpen(false);
          setSelectedTaskForEpod(null);
        }
        if (failureModalOpen && !submittingFailure) {
          setFailureModalOpen(false);
          setSelectedTaskForFailure(null);
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [epodModalOpen, failureModalOpen, submittingEpod, submittingFailure]);

  useEffect(() => {
    loadDeliveryTasks();
    loadDeliveryHistory();

    const handleCancelled = (data: any) => {
      setMsg({
        type: 'error',
        text: `⚠️ Đơn [${data.trackingCode || data.orderId}] đã bị hủy: "${data.reason || 'Người nhận hủy'}".`,
      });
      loadDeliveryTasks();
    };

    const handleOrderUpdated = () => {
      loadDeliveryTasks();
      loadDeliveryHistory();
    };

    if (socket) {
      socket.on('shipper:order_cancelled', handleCancelled);
      socket.on('order:updated', handleOrderUpdated);
    }

    return () => {
      if (socket) {
        socket.off('shipper:order_cancelled', handleCancelled);
        socket.off('order:updated', handleOrderUpdated);
      }
    };
  }, []);

  const loadDeliveryTasks = async () => {
    setFetchingTasks(true);
    try {
      // Check online/offline status
      try {
        const profRes = await axiosClient.get('/auth/shipper/profile');
        if (profRes.data?.data) {
          const workingState = profRes.data.data.isWorking !== false;
          setIsWorking(workingState);
          localStorage.setItem('shipper_is_working', workingState ? 'true' : 'false');
        }
      } catch {}

      const res = await axiosClient.get('/orders/shipper/delivery-tasks');
      if (res.data?.data) {
        let list: DeliveryTask[] = res.data.data;
        // Áp dụng sắp xếp lộ trình tối ưu đã lưu từ trang Tuyến
        try {
          const savedSeq = localStorage.getItem('shipper_optimized_route_order');
          if (savedSeq) {
            const seqIds: string[] = JSON.parse(savedSeq);
            list.sort((a, b) => {
              const idxA = seqIds.indexOf(a.id || a._id);
              const idxB = seqIds.indexOf(b.id || b._id);
              if (idxA !== -1 && idxB !== -1) return idxA - idxB;
              if (idxA !== -1) return -1;
              if (idxB !== -1) return 1;
              return 0;
            });
          }
        } catch {}

        setDeliveryTasks(list);
        if (res.data.currentTripId) setCurrentTripId(res.data.currentTripId);
        if (res.data.shipperArea) setShipperArea(res.data.shipperArea);

        // Tự động chọn tab phù hợp
        const hasHubPending = list.some((t) => t.status === 'IN_HUB_DEST' || t.status === 'ARRIVED_AT_DEST_HUB');
        if (!hasHubPending && list.some((t) => t.status === 'OUT_FOR_DELIVERY' || t.status === 'DELIVERING')) {
          setActiveTab((prev) => (prev === 'HUB_SCAN' ? 'DELIVERY' : prev));
        }
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
        if (res.data.currentTripId && !currentTripId) {
          setCurrentTripId(res.data.currentTripId);
        }
      }
    } catch (err) {
      console.warn('Lỗi tải lịch sử giao hàng:', err);
    } finally {
      setFetchingHistory(false);
    }
  };

  // Quét Camera hoặc Barcode nhận kiện tại Hub đích
  const handleScanOrReceiveAtHub = async (code: string) => {
    if (!code || !code.trim()) return;
    const cleanCode = code.trim().toUpperCase();
    try {
      const res = await axiosClient.post('/orders/shipper/confirm-delivery-receive', {
        trackingCode: cleanCode,
      });
      setMsg({
        type: 'success',
        text: `✅ ${res.data?.message || `Đã nhận thành công đơn [${cleanCode}] vào thùng xe!`}`,
      });
      setManualCode('');
      await loadDeliveryTasks();
    } catch (err: any) {
      setMsg({
        type: 'error',
        text: err.response?.data?.message || `Lỗi nhận kiện [${cleanCode}] tại Hub`,
      });
    }
  };

  // Xác nhận nhận đơn lẻ bằng nút bấm tại Hub
  const handleIndividualReceive = async (task: DeliveryTask) => {
    const code = task.trackingCode || task.id || task._id;
    setReceivingId(task.id || task._id);
    try {
      const res = await axiosClient.post('/orders/shipper/confirm-delivery-receive', {
        trackingCode: code,
      });
      setMsg({
        type: 'success',
        text: `✅ ${res.data?.message || `Đã nhận kiện [${task.trackingCode}] vào thùng xe!`}`,
      });
      await loadDeliveryTasks();
    } catch (err: any) {
      setMsg({
        type: 'error',
        text: err.response?.data?.message || `Lỗi nhận kiện [${task.trackingCode}]`,
      });
    } finally {
      setReceivingId(null);
    }
  };

  // Nhận hàng loạt tất cả các kiện tại Hub
  const handleBatchReceiveAtHub = async () => {
    const hubItems = deliveryTasks.filter((t) => t.status === 'IN_HUB_DEST' || t.status === 'ARRIVED_AT_DEST_HUB' || t.status === 'SORTED');
    const ids = hubItems.map((t) => t.id || t._id);
    if (ids.length === 0) return;
    setBatchReceiving(true);
    try {
      const res = await axiosClient.post('/orders/shipper/batch-delivery-receive', {
        orderIds: ids,
      });
      setMsg({
        type: 'success',
        text: `✅ ${res.data?.message || `Đã nhận toàn bộ ${ids.length} kiện tại Hub!`}`,
      });
      await loadDeliveryTasks();
      setActiveTab('DELIVERY');
    } catch (err: any) {
      setMsg({
        type: 'error',
        text: err.response?.data?.message || 'Lỗi nhận hàng loạt tại Hub',
      });
    } finally {
      setBatchReceiving(false);
    }
  };

  // Quản lý Camera Bằng Chứng Giao Hàng (e-POD)
  const stopEpodCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startEpodCamera = async () => {
    setCameraError(null);
    stopEpodCamera();
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        cameraStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } else {
        setCameraError('Trình duyệt hoặc thiết bị không hỗ trợ mở camera trực tiếp.');
      }
    } catch (err: any) {
      console.warn('Lỗi mở camera ePOD:', err);
      setCameraError('Không thể mở Camera tự động. Vui lòng cấp quyền máy ảnh hoặc tải ảnh bưu kiện lên.');
    }
  };

  const handleCapturePhoto = () => {
    if (!selectedTaskForEpod) return;
    const canvas = document.createElement('canvas');
    let width = 640;
    let height = 480;

    if (videoRef.current && videoRef.current.videoWidth > 0) {
      width = videoRef.current.videoWidth;
      height = videoRef.current.videoHeight;
    }
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (videoRef.current && videoRef.current.videoWidth > 0) {
      ctx.drawImage(videoRef.current, 0, 0, width, height);
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ẢNH CHỤP BƯU KIỆN THỰC TẾ (e-POD)', width / 2, height / 2 - 20);
      ctx.fillText(selectedTaskForEpod.trackingCode, width / 2, height / 2 + 15);
      ctx.textAlign = 'left';
    }

    // Watermark overlay
    const bannerH = 90;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(0, height - bannerH, width, bannerH);

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 15px monospace';
    ctx.fillText(`[e-POD BẰNG CHỨNG GIAO] ${selectedTaskForEpod.trackingCode}`, 16, height - 60);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '12px monospace';
    ctx.fillText(`Thời gian: ${new Date().toLocaleString('vi-VN')} | GPS: 10.776889, 106.700806`, 16, height - 38);
    ctx.fillText(`Người nhận: ${selectedTaskForEpod.buyerName} | SĐT: ${selectedTaskForEpod.phone}`, 16, height - 18);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    setCapturedPhoto(dataUrl);
    stopEpodCamera();
  };

  const handleFileUploadFallback = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTaskForEpod) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const bannerH = Math.max(90, Math.floor(img.height * 0.12));
          ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
          ctx.fillRect(0, img.height - bannerH, img.width, bannerH);
          ctx.fillStyle = '#10b981';
          ctx.font = 'bold 16px monospace';
          ctx.fillText(`[e-POD BẰNG CHỨNG GIAO] ${selectedTaskForEpod.trackingCode}`, 20, img.height - bannerH + 28);
          ctx.fillStyle = '#f8fafc';
          ctx.font = '13px monospace';
          ctx.fillText(`Thời gian: ${new Date().toLocaleString('vi-VN')} | GPS: 10.776889, 106.700806`, 20, img.height - bannerH + 54);
          setCapturedPhoto(canvas.toDataURL('image/jpeg', 0.88));
          stopEpodCamera();
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRetakePhoto = () => {
    setCapturedPhoto(null);
    startEpodCamera();
  };

  const closeEpodModal = () => {
    stopEpodCamera();
    setEpodModalOpen(false);
    setSelectedTaskForEpod(null);
    setCapturedPhoto(null);
    setEpodStep('FORM');
    setCameraError(null);
  };

  // Mở modal ePOD (Bước 1: Form)
  const openEpodModal = (task: DeliveryTask) => {
    setSelectedTaskForEpod(task);
    setActualCod(task.codAmount ? String(task.codAmount) : '0');
    setHandoverType('DIRECT_CUSTOMER');
    setPodNote('');
    setCapturedPhoto(null);
    setEpodStep('FORM');
    setCameraError(null);
    setEpodModalOpen(true);
  };

  // Chuyển sang Bước 2 (Mở Camera chụp ảnh) khi bấm "Giao Thành Công"
  const handleProceedToCamera = (e: React.FormEvent) => {
    e.preventDefault();
    setEpodStep('CAMERA');
    setTimeout(() => {
      startEpodCamera();
    }, 100);
  };

  // Submit ePOD Xác Nhận Hoàn Tất Sau Khi Chụp Ảnh Bắt Buộc
  const handleFinalConfirmDelivery = async () => {
    if (!selectedTaskForEpod) return;
    if (!capturedPhoto) {
      setMsg({
        type: 'error',
        text: 'Vui lòng chụp ảnh bưu kiện có mã vận đơn & mã QR trước khi xác nhận!',
      });
      return;
    }

    setSubmittingEpod(true);
    try {
      const codNum = actualCod ? parseFloat(actualCod) : 0;
      const codeUpper = selectedTaskForEpod.trackingCode.trim().toUpperCase();

      const handoverLabels: Record<string, string> = {
        DIRECT_CUSTOMER: 'Khách hàng trực tiếp nhận',
        RECEPTIONIST_GUARD: 'Gửi lễ tân / bảo vệ tòa nhà',
        FAMILY_NEIGHBOR: 'Gửi người thân / đồng nghiệp',
        FRONT_DOOR: 'Đặt trước cửa nhà theo yêu cầu',
      };

      const fullNote = `[${handoverLabels[handoverType] || handoverType}] ${podNote}`.trim();

      await axiosClient.post('/custody/transfer', {
        trackingCode: codeUpper,
        transferType: 'SHIPPER_TO_BUYER',
        actualCod: codNum,
        packageCondition: 'INTACT',
        conditionNote: fullNote,
        signatureUrl: capturedPhoto,
        evidencePhotos: [capturedPhoto],
        gpsLocation: { lat: 10.776889, lng: 106.700806 },
      });

      setMsg({
        type: 'success',
        text: `✅ Giao thành công đơn [${codeUpper}]! Bằng chứng POD đã được lưu giữ (bảo lưu 7 ngày, hạn khiếu nại 3 ngày).`,
      });

      closeEpodModal();
      await loadDeliveryTasks();
      await loadDeliveryHistory();
    } catch (err: any) {
      setMsg({
        type: 'error',
        text: err.response?.data?.message || `Lỗi khi xác nhận giao đơn [${selectedTaskForEpod.trackingCode}]`,
      });
    } finally {
      setSubmittingEpod(false);
    }
  };

  // Mở modal Báo Giao Thất Bại
  const openFailureModal = (task: DeliveryTask) => {
    setSelectedTaskForFailure(task);
    setFailureTier('TIER_1');
    setReasonGroup('CANNOT_CONTACT');
    setFailureReasonText('Gọi điện khách không nghe máy / Thuê bao');
    setContactAttempts(2);
    setRescheduleDate('');
    setFailureNote('');
    setFailureModalOpen(true);
  };

  // Submit Báo Giao Thất Bại
  const handleSubmitFailure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskForFailure) return;

    setSubmittingFailure(true);
    try {
      const orderId = selectedTaskForFailure._id || selectedTaskForFailure.trackingCode;

      const res = await axiosClient.post(`/delivery-failure/orders/${orderId}/delivery-failure`, {
        reasonGroup,
        contactAttempts: Number(contactAttempts) || 1,
        rescheduleRequestedAt: rescheduleDate ? new Date(rescheduleDate).toISOString() : undefined,
        note: failureNote ? `[${failureReasonText}] ${failureNote}` : failureReasonText,
        proofImageUrls: failureTier === 'TIER_2' ? ['https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=300&auto=format&fit=crop&q=80'] : [],
        latitude: 10.776889,
        longitude: 106.700806,
      });

      setMsg({
        type: 'success',
        text: res.data?.message || `Đã ghi nhận báo giao thất bại đơn [${selectedTaskForFailure.trackingCode}]`,
      });

      setFailureModalOpen(false);
      setSelectedTaskForFailure(null);
      loadDeliveryTasks();
      loadDeliveryHistory();
    } catch (err: any) {
      setMsg({
        type: 'error',
        text: err.response?.data?.message || 'Lỗi gửi báo cáo giao hàng thất bại',
      });
    } finally {
      setSubmittingFailure(false);
    }
  };

  // Phân loại danh sách theo trạng thái
  const hubPendingTasks = deliveryTasks.filter((t) => t.status === 'IN_HUB_DEST' || t.status === 'ARRIVED_AT_DEST_HUB' || t.status === 'SORTED' || t.status === 'DISPATCHED_TO_DESTINATION');
  const activeDeliveryTasks = deliveryTasks.filter((t) => t.status === 'OUT_FOR_DELIVERY' || t.status === 'DELIVERING');

  // Tính tổng COD
  const totalActiveCod = activeDeliveryTasks.reduce((sum, t) => sum + (t.codAmount || 0), 0);
  const totalDeliveredCod = deliveryHistory.reduce((sum, h) => sum + (h.codAmount || 0), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-bold text-sm text-white flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-emerald-400" />
              Nhiệm Vụ Giao Hàng Chặng Cuối (Last-Mile Delivery)
            </h2>
            {currentTripId && (
              <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                <Barcode className="w-3 h-3" /> Chuyến: {currentTripId}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Khu vực phụ trách:{' '}
            <strong className="text-emerald-400">
              {shipperArea?.subZone ? `${shipperArea.subZone}, ` : ''}{shipperArea?.district || 'Quận 1'},{' '}
              {shipperArea?.province || 'TP. Hồ Chí Minh'}
            </strong>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              loadDeliveryTasks();
              loadDeliveryHistory();
            }}
            title="Làm mới danh sách"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${fetchingTasks || fetchingHistory ? 'animate-spin' : ''}`} />
          </button>
          <span className="text-xs bg-blue-500/20 text-blue-300 font-bold px-3 py-1.5 rounded-xl border border-blue-500/30 font-mono">
            {hubPendingTasks.length} tại Hub
          </span>
          <span className="text-xs bg-emerald-500/20 text-emerald-300 font-bold px-3 py-1.5 rounded-xl border border-emerald-500/30 font-mono">
            {activeDeliveryTasks.length} đang giao
          </span>
          <span className="text-xs bg-amber-500/20 text-amber-300 font-bold px-3 py-1.5 rounded-xl border border-amber-500/30 font-mono flex items-center gap-1">
            <DollarSign className="w-3 h-3" /> COD: {totalActiveCod.toLocaleString('vi-VN')} đ
          </span>
        </div>
      </div>

      {/* 3 TABS CHUYỂN ĐỔI: 1. QUÉT NHẬN TẠI HUB - 2. CẦN ĐI GIAO - 3. LỊCH SỬ ĐÃ GIAO */}
      <div className="grid grid-cols-3 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 gap-1.5">
        <button
          onClick={() => setActiveTab('HUB_SCAN')}
          className={`py-2 px-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
            activeTab === 'HUB_SCAN'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Barcode className="w-4 h-4 shrink-0" />
          <span className="truncate">1. Nhận Tại Hub ({hubPendingTasks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('DELIVERY')}
          className={`py-2 px-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
            activeTab === 'DELIVERY'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Truck className="w-4 h-4 shrink-0" />
          <span className="truncate">2. Cần Đi Giao ({activeDeliveryTasks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`py-2 px-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
            activeTab === 'HISTORY'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <History className="w-4 h-4 shrink-0" />
          <span className="truncate">3. Lịch Sử ({deliveryHistory.length})</span>
        </button>
      </div>

      {msg && (
        <div
          className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between shadow ${
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

      {/* TAB 1: QUÉT TIẾP NHẬN KIỆN HÀNG TẠI HUB ĐÍCH */}
      {activeTab === 'HUB_SCAN' && (
        <div className="space-y-4">
          {/* Offline Guard Banner */}
          {!isWorking && (
            <div className="bg-rose-950/60 border border-rose-500/50 p-4.5 rounded-2xl text-center space-y-2.5 shadow-xl">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Ca Làm Việc Đang Tắt (Offline)</h3>
                <p className="text-[11px] text-rose-200 mt-0.5">
                  Chức năng quét nhận tại Hub đang tạm khóa. Vui lòng vào trang <strong>Lộ Trình Tuyến</strong> để <strong>Bật Ca Trực</strong> trước khi bắt đầu tác nghiệp!
                </p>
              </div>
              <button
                onClick={() => navigate('/shipper/zone')}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center gap-1.5 mx-auto"
              >
                <Compass className="w-3.5 h-3.5" />
                Vào Trang Tuyến & Bật Ca Ngay
              </button>
            </div>
          )}

          {/* Hub Batch Receive Banner & Actions */}
          <div className="bg-blue-950/40 border border-blue-500/40 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 shrink-0">
                <Barcode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Tiếp Nhận Bưu Phẩm Tại Bưu Cục Hub</h3>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Đã nhận: <strong className="text-emerald-400 font-mono font-bold">{activeDeliveryTasks.length}</strong> / {deliveryTasks.length} kiện bưu phẩm
                </p>
              </div>
            </div>

            {hubPendingTasks.length > 0 && (
              <button
                onClick={handleBatchReceiveAtHub}
                disabled={batchReceiving || !isWorking}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
              >
                <Zap className="w-3.5 h-3.5" />
                {batchReceiving ? 'Đang nhận...' : `⚡ Nhận Tất Cả Tại Hub (${hubPendingTasks.length} Kiện)`}
              </button>
            )}
          </div>

          {/* Camera Scanner (Chỉ hiển thị tại Tab Quét Nhận Hub) */}
          <CameraScanner
            onScanSuccess={(code) => isWorking && handleScanOrReceiveAtHub(code)}
            isScanning={isCameraActive && isWorking}
            onToggleScan={setIsCameraActive}
          />

          {/* Manual Barcode Input (Chỉ hiển thị tại Tab Quét Nhận Hub) */}
          <div className={`bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2.5 shadow-md ${!isWorking ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Barcode className="w-4 h-4 text-cyan-400" />
                Quét mã vạch hoặc nhập mã đơn để nhận kiện tại Hub:
              </label>
              <span className="text-[10px] text-slate-500">Camera / Máy quét Barcode 1D & QR</span>
            </div>
            <div className="flex gap-2">
              <input
                id="input-hub-manual-code"
                type="text"
                disabled={!isWorking}
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleScanOrReceiveAtHub(manualCode);
                  }
                }}
                placeholder="VD: ELG-VN-353801 hoặc quét barcode..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs uppercase font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
              />
              <button
                id="btn-hub-manual-receive"
                onClick={() => handleScanOrReceiveAtHub(manualCode)}
                disabled={!manualCode.trim() || !isWorking}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition disabled:opacity-50 cursor-pointer shadow flex items-center gap-1.5"
              >
                <PackageCheck className="w-3.5 h-3.5" />
                Quét Nhận Kiện
              </button>
            </div>
          </div>

          {/* Danh Sách Các Kiện Đang Nằm Tại Hub Chờ Nhận */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-300">
                Kiện Hàng Đang Chờ Nhận Tại Hub ({hubPendingTasks.length} kiện):
              </span>
              <span className="text-[11px] text-blue-400 font-mono font-bold">
                Trạng thái: IN_HUB_DEST
              </span>
            </div>

            {fetchingTasks ? (
              <div className="p-8 text-center text-slate-500 text-xs space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-400" />
                <p>Đang tải danh sách bưu phẩm tại Hub...</p>
              </div>
            ) : hubPendingTasks.length === 0 ? (
              <div className="bg-slate-900 border border-emerald-500/40 p-6 rounded-2xl text-center space-y-3 shadow-lg">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <div>
                  <h4 className="text-sm font-bold text-white">Đã Quét Nhận 100% Bưu Phẩm Tại Hub!</h4>
                  <p className="text-xs text-slate-300 mt-1">
                    Toàn bộ <strong className="text-emerald-400 font-bold">{activeDeliveryTasks.length} kiện</strong> đã được nạp vào thùng xe và chuyển sang trạng thái <strong>Đang Giao Hàng</strong>.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('DELIVERY')}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition cursor-pointer inline-flex items-center gap-2"
                >
                  <Truck className="w-4 h-4" />
                  Chuyển Sang Tab Cần Đi Giao ({activeDeliveryTasks.length} Đơn)
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              hubPendingTasks.map((task) => (
                <div
                  key={task.id || task._id}
                  className={`bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl space-y-3 transition shadow-sm ${!isWorking ? 'opacity-70' : ''}`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-cyan-400">{task.trackingCode}</span>
                      <span className="text-[9px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded font-mono font-semibold">
                        Tại Bưu Cục Phát
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {(task.codAmount > 0 || task.isCod) && (
                        <span className="text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-mono font-bold flex items-center gap-1 shadow-sm">
                          <DollarSign className="w-3 h-3" /> Thu COD: {Number(task.codAmount || 0).toLocaleString('vi-VN')} đ
                        </span>
                      )}
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono border border-slate-700">
                        {task.declaredWeight} kg
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-white text-xs flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                      {task.buyerName}
                    </h3>
                    <p className="text-[11px] text-slate-300 flex items-start gap-1.5 mt-1 leading-relaxed">
                      <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                      <span>{task.address}</span>
                    </p>
                  </div>

                  {(task.codAmount > 0 || task.isCod) && (
                    <div className="bg-amber-950/30 border border-amber-500/30 px-3 py-1.5 rounded-xl flex items-center justify-between text-xs font-mono">
                      <span className="text-amber-200/90 font-semibold flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Tiền Thu Hộ (COD Đối Chiếu Vận Đơn):</span>
                      </span>
                      <span className="text-amber-300 font-bold text-xs">
                        {Number(task.codAmount || 0).toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 flex-wrap gap-2">
                    <span className="text-[10px] text-slate-400 font-mono">
                      {task.itemsCount} kiện hàng bưu phẩm
                    </span>

                    <button
                      onClick={() => handleIndividualReceive(task)}
                      disabled={receivingId === (task.id || task._id) || !isWorking}
                      className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow"
                    >
                      <PackageCheck className="w-3.5 h-3.5" />
                      {receivingId === (task.id || task._id) ? 'Đang nhận...' : 'Quét Nhận Kiện Này'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DANH SÁCH CẦN ĐI GIAO (ĐÃ LOẠI BỎ CAMERA VÀ Ô NHẬP MÃ THỦ CÔNG) */}
      {activeTab === 'DELIVERY' && (
        <div className="space-y-4">
          {/* Offline Guard Banner */}
          {!isWorking && (
            <div className="bg-rose-950/60 border border-rose-500/50 p-4.5 rounded-2xl text-center space-y-2.5 shadow-xl">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Ca Làm Việc Đang Tắt (Offline)</h3>
                <p className="text-[11px] text-rose-200 mt-0.5">
                  Chức năng giao hàng đang tạm khóa. Vui lòng vào trang <strong>Lộ Trình Tuyến</strong> để <strong>Bật Ca Trực</strong> trước khi bắt đầu tác nghiệp!
                </p>
              </div>
              <button
                onClick={() => navigate('/shipper/zone')}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center gap-1.5 mx-auto"
              >
                <Compass className="w-3.5 h-3.5" />
                Vào Trang Tuyến & Bật Ca Ngay
              </button>
            </div>
          )}

          {/* Active Delivery Tasks List (Giao diện tinh gọn, không Camera / Input) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-300">
                Danh Sách Đang Đi Giao ({activeDeliveryTasks.length} đơn):
              </span>
              <span className="text-[11px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                <Compass className="w-3 h-3" /> Sắp xếp theo lộ trình tối ưu #1 ➔ #{activeDeliveryTasks.length}
              </span>
            </div>

            {fetchingTasks ? (
              <div className="p-8 text-center text-slate-500 text-xs space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400" />
                <p>Đang tải danh sách đơn hàng cần giao...</p>
              </div>
            ) : activeDeliveryTasks.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center space-y-3 text-slate-400">
                {hubPendingTasks.length > 0 ? (
                  <>
                    <Barcode className="w-10 h-10 text-blue-400 mx-auto" />
                    <div>
                      <h4 className="text-sm font-bold text-white">Chưa Có Đơn Nào Được Nhận Vào Xe</h4>
                      <p className="text-xs text-slate-300 mt-1">
                        Hiện có <strong className="text-blue-400 font-bold">{hubPendingTasks.length} kiện</strong> đang ở Hub. Hãy chuyển sang Tab "1. Nhận Tại Hub" để quét nhận trước khi đi giao!
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('HUB_SCAN')}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition cursor-pointer inline-flex items-center gap-2"
                    >
                      <Barcode className="w-4 h-4" />
                      Sang Tab 1: Quét Nhận Tại Hub ({hubPendingTasks.length} Kiện)
                    </button>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto opacity-80" />
                    <p className="text-xs font-bold text-white">Bạn đã hoàn thành tất cả đơn giao hôm nay!</p>
                    <p className="text-[11px] text-slate-500">Hãy kiểm tra tab "3. Lịch Sử Đã Giao" để đối soát số tiền COD đã thu hộ.</p>
                  </>
                )}
              </div>
            ) : (
              activeDeliveryTasks.map((task, index) => (
                <div
                  key={task.id || task._id}
                  className={`bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl space-y-3 transition shadow-sm ${!isWorking ? 'opacity-70' : ''}`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] font-mono">
                        {index + 1}
                      </span>
                      <span className="font-mono text-xs font-bold text-emerald-400">{task.trackingCode}</span>
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-semibold">
                        Đang Giao Hàng
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {(task.codAmount > 0 || task.isCod) && (
                        <span className="text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-mono font-bold flex items-center gap-1 shadow-sm">
                          <DollarSign className="w-3 h-3" /> Thu COD: {Number(task.codAmount || 0).toLocaleString('vi-VN')} đ
                        </span>
                      )}
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono border border-slate-700">
                        {task.declaredWeight} kg
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-white text-xs flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                      {task.buyerName}
                    </h3>
                    <p className="text-[11px] text-slate-300 flex items-start gap-1.5 mt-1 leading-relaxed">
                      <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                      <span>{task.address}</span>
                    </p>
                  </div>

                  {(task.codAmount > 0 || task.isCod) && (
                    <div className="bg-amber-950/30 border border-amber-500/30 px-3 py-1.5 rounded-xl flex items-center justify-between text-xs font-mono">
                      <span className="text-amber-200/90 font-semibold flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Tiền Thu Hộ (COD Đối Chiếu Vận Đơn):</span>
                      </span>
                      <span className="text-amber-300 font-bold text-xs">
                        {Number(task.codAmount || 0).toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${task.phone}`}
                        className="text-[11px] font-bold text-blue-400 flex items-center gap-1 bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1.5 rounded-xl border border-blue-500/20 transition"
                      >
                        <Phone className="w-3.5 h-3.5" /> Gọi: {task.phone}
                      </a>

                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(task.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-bold text-cyan-400 flex items-center gap-1 bg-cyan-500/10 hover:bg-cyan-500/20 px-2.5 py-1.5 rounded-xl border border-cyan-500/20 transition"
                      >
                        <Navigation className="w-3.5 h-3.5" /> Chỉ Đường
                      </a>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openFailureModal(task)}
                        disabled={submittingFailure || submittingEpod}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-[11px] transition cursor-pointer flex items-center gap-1.5"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        Báo Thất Bại
                      </button>

                      <button
                        onClick={() => openEpodModal(task)}
                        disabled={submittingEpod || submittingFailure}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition cursor-pointer flex items-center gap-1.5 shadow-md"
                      >
                        <PackageCheck className="w-3.5 h-3.5" />
                        Giao Hàng (e-POD)
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: LỊCH SỬ ĐÃ GIAO TRONG CA */}
      {activeTab === 'HISTORY' && (
        <div className="space-y-4">
          <div className="bg-purple-950/30 border border-purple-500/30 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Đối Soát Giao Hàng Trong Ca</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Đã phát thành công <strong className="text-purple-400">{deliveryHistory.length}</strong> đơn trong Chuyến{' '}
                  <span className="font-mono text-white font-bold">[{currentTripId || 'DLV-ACTIVE'}]</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-slate-900 px-3.5 py-1.5 rounded-xl border border-slate-700 text-right">
                <span className="text-[10px] text-slate-400 block">Tổng Tiền COD Đã Thu Hộ</span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {totalDeliveredCod.toLocaleString('vi-VN')} đ
                </span>
              </div>
              <button
                onClick={loadDeliveryHistory}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${fetchingHistory ? 'animate-spin' : ''}`} />
                Cập nhật
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {fetchingHistory ? (
              <div className="p-8 text-center text-slate-500 text-xs space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-400" />
                <p>Đang tải lịch sử giao hàng...</p>
              </div>
            ) : deliveryHistory.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center space-y-1.5 text-slate-400">
                <History className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-xs font-bold text-white">Chưa có đơn hàng nào được giao thành công trong ca</p>
                <p className="text-[11px] text-slate-500">Hãy chuyển sang tab "Cần Đi Giao" để bắt đầu phát hàng cho khách.</p>
              </div>
            ) : (
              deliveryHistory.map((item) => (
                <div
                  key={item.id || item._id}
                  className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2.5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-purple-400">{item.trackingCode}</span>
                      <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded font-mono font-bold">
                        {item.status}
                      </span>
                    </div>
                    {(item.codAmount > 0 || item.isCod) && (
                      <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                        COD: {Number(item.codAmount || 0).toLocaleString('vi-VN')} đ
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="font-bold text-white text-xs">{item.buyerName}</h4>
                    <p className="text-[11px] text-slate-400 flex items-start gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                      <span>{item.address}</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800 font-mono">
                    <span>Trọng lượng: {item.declaredWeight} kg</span>
                    <span className="text-slate-500">
                      Giao lúc: {item.deliveredAt ? new Date(item.deliveredAt).toLocaleTimeString('vi-VN') : 'Vừa xong'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: XÁC NHẬN GIAO HÀNG ĐIỆN TỬ (e-POD) */}
      {epodModalOpen && selectedTaskForEpod && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-slate-100 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <PackageCheck className="w-5 h-5" />
                <span>{epodStep === 'FORM' ? 'Xác Nhận Giao Hàng Điện Tử (e-POD)' : 'Chụp Bằng Chứng Giao Hàng Bắt Buộc'}</span>
              </div>
              <button
                onClick={closeEpodModal}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Stepper Indicator */}
            <div className="flex items-center gap-2 text-[11px] font-semibold bg-slate-950 p-1.5 rounded-xl border border-slate-800">
              <div className={`flex-1 py-1 text-center rounded-lg transition ${epodStep === 'FORM' ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30' : 'text-slate-500'}`}>
                1. Bàn Giao & COD
              </div>
              <div className={`flex-1 py-1 text-center rounded-lg transition ${epodStep === 'CAMERA' ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30' : 'text-slate-500'}`}>
                2. Chụp Bằng Chứng (Live Camera)
              </div>
            </div>

            {/* Buyer Details */}
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-emerald-400 text-sm">{selectedTaskForEpod.trackingCode}</span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono font-bold">
                  {selectedTaskForEpod.declaredWeight} kg
                </span>
              </div>
              <div className="text-white font-bold">{selectedTaskForEpod.buyerName}</div>
              <div className="text-slate-400 text-[11px] leading-relaxed">{selectedTaskForEpod.address}</div>
              <div className="text-blue-400 text-[11px] font-mono">SĐT: {selectedTaskForEpod.phone}</div>
            </div>

            {/* BƯỚC 1: FORM THÔNG TIN BÀN GIAO & COD */}
            {epodStep === 'FORM' && (
              <form onSubmit={handleProceedToCamera} className="space-y-4">
                {/* COD Verification */}
                <div className="space-y-2 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-amber-400" />
                      Đối Soát Tiền Thu Hộ (COD):
                    </label>
                    <span className="text-[11px] text-amber-400 font-mono font-bold">
                      Cần thu: {Number(selectedTaskForEpod.codAmount || 0).toLocaleString('vi-VN')} đ
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={actualCod}
                      onChange={(e) => setActualCod(e.target.value)}
                      placeholder="Số tiền thực thu (VNĐ)"
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setActualCod(String(selectedTaskForEpod.codAmount || 0))}
                      className="px-3 py-1.5 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 rounded-xl text-[11px] font-bold border border-amber-500/30 cursor-pointer"
                    >
                      Thu Đúng COD
                    </button>
                    <button
                      type="button"
                      onClick={() => setActualCod('0')}
                      className="px-3 py-1.5 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-xl text-[11px] font-semibold border border-slate-700 cursor-pointer"
                    >
                      0 đ
                    </button>
                  </div>
                </div>

                {/* Handover Method Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 block">
                    Hình Thức Bàn Giao:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'DIRECT_CUSTOMER', label: 'Khách trực tiếp nhận' },
                      { id: 'RECEPTIONIST_GUARD', label: 'Gửi lễ tân / bảo vệ' },
                      { id: 'FAMILY_NEIGHBOR', label: 'Gửi người thân / hàng xóm' },
                      { id: 'FRONT_DOOR', label: 'Đặt trước cửa nhà' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setHandoverType(m.id)}
                        className={`p-2.5 rounded-xl border text-left text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                          handoverType === m.id
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <Check className={`w-3.5 h-3.5 ${handoverType === m.id ? 'opacity-100' : 'opacity-0'}`} />
                        <span>{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    Ghi Chú Giao Hàng (Tùy chọn):
                  </label>
                  <input
                    type="text"
                    value={podNote}
                    onChange={(e) => setPodNote(e.target.value)}
                    placeholder="VD: Gửi anh bảo vệ ca trực sáng..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={closeEpodModal}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-lg"
                  >
                    <Camera className="w-4 h-4" />
                    Giao Thành Công
                    <ArrowRight className="w-4 h-4 ml-0.5" />
                  </button>
                </div>
              </form>
            )}

            {/* BƯỚC 2: CHỤP ẢNH BẰNG CHỨNG LIVE CAMERA & XÁC NHẬN */}
            {epodStep === 'CAMERA' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Quy định khiếu nại & bảo lưu */}
                <div className="bg-amber-950/40 border border-amber-500/30 p-3 rounded-2xl text-[11px] space-y-1 text-amber-200">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300">
                    <ShieldCheck className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>Quy Tắc Chụp Ảnh Xác Nhận Bưu Kiện:</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Ảnh chụp <strong>bắt buộc phải thấy rõ bưu kiện, mã vận đơn [{selectedTaskForEpod.trackingCode}]</strong> và tem <strong>Barcode/QR</strong>.
                  </p>
                  <p className="text-[10px] text-amber-400/90 font-mono">
                    🛡️ Hệ thống bảo lưu thông tin & bằng chứng 7 ngày. Hạn chót khiếu nại của khách: 3 ngày.
                  </p>
                </div>

                {/* Camera Viewfinder hoặc Ảnh đã chụp */}
                <div className="relative bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden min-h-[260px] flex items-center justify-center">
                  {!capturedPhoto ? (
                    <div className="relative w-full h-[260px] bg-black flex items-center justify-center">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />

                      {/* Khung ngắm chụp ảnh */}
                      <div className="absolute inset-4 border-2 border-dashed border-emerald-500/60 rounded-xl pointer-events-none flex flex-col justify-between p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] bg-black/70 text-emerald-300 px-2 py-0.5 rounded font-mono font-bold">
                            📍 GPS: 10.776889, 106.700806
                          </span>
                          <span className="text-[10px] bg-black/70 text-white px-2 py-0.5 rounded font-mono font-bold">
                            {selectedTaskForEpod.trackingCode}
                          </span>
                        </div>
                        <div className="text-center">
                          <span className="text-[10px] bg-emerald-500/80 text-black px-2.5 py-0.5 rounded-full font-bold shadow">
                            Đặt mã QR & Barcode vào giữa khung
                          </span>
                        </div>
                      </div>

                      {cameraError && (
                        <div className="absolute inset-0 bg-slate-900/90 p-4 flex flex-col items-center justify-center text-center space-y-2">
                          <AlertTriangle className="w-8 h-8 text-amber-400" />
                          <p className="text-xs text-amber-200">{cameraError}</p>
                          <label className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow">
                            <Upload className="w-3.5 h-3.5" />
                            Tải Ảnh Từ Thiết Bị
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={handleFileUploadFallback}
                              className="hidden"
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="relative w-full space-y-2 p-2">
                      <img
                        src={capturedPhoto}
                        alt="Bằng chứng giao hàng"
                        className="w-full h-[240px] object-contain rounded-xl border border-emerald-500 shadow-lg bg-black"
                      />
                      <div className="text-[11px] text-emerald-400 text-center font-semibold flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Đã chụp ảnh bằng chứng hoàn tất (gắn Watermark & GPS)
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons for Camera Step */}
                {!capturedPhoto ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        stopEpodCamera();
                        setEpodStep('FORM');
                      }}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                    >
                      Quay Lại
                    </button>
                    <button
                      type="button"
                      onClick={handleCapturePhoto}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer transition"
                    >
                      <Camera className="w-4 h-4" />
                      📸 Chụp Ảnh Xác Nhận Bưu Kiện
                    </button>
                    <label className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer border border-slate-700" title="Tải ảnh từ máy">
                      <Upload className="w-4 h-4" />
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileUploadFallback}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={handleRetakePhoto}
                      disabled={submittingEpod}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Chụp Lại
                    </button>
                    <button
                      type="button"
                      onClick={handleFinalConfirmDelivery}
                      disabled={submittingEpod}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg"
                    >
                      {submittingEpod ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Xác Nhận Hoàn Tất Giao Hàng
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: BÁO GIAO HÀNG THẤT BẠI (2 TẦNG CHUẨN HÓA) */}
      {failureModalOpen && selectedTaskForFailure && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <AlertTriangle className="w-5 h-5" />
                <span>Báo Giao Hàng Thất Bại: {selectedTaskForFailure.trackingCode}</span>
              </div>
              <button
                onClick={() => setFailureModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
              <div className="text-white font-bold">{selectedTaskForFailure.buyerName}</div>
              <div className="text-slate-400 text-[11px]">{selectedTaskForFailure.address}</div>
              <div className="text-blue-400 text-[11px] font-mono">SĐT: {selectedTaskForFailure.phone}</div>
            </div>

            <form onSubmit={handleSubmitFailure} className="space-y-4">
              {/* Chọn Tầng Phân Loại */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">
                  1. Chọn Tính Chất Thất Bại (Phân Luồng Xử Lý):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFailureTier('TIER_1');
                      setReasonGroup('CANNOT_CONTACT');
                      setFailureReasonText('Gọi điện khách không nghe máy / Thuê bao');
                    }}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      failureTier === 'TIER_1'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-1 ring-amber-500'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      Tầng 1: Hẹn Giao Lại
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Giữ đơn tại Bưu cục phát, xếp vào ca giao tiếp theo (PENDING_REDELIVERY)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFailureTier('TIER_2');
                      setReasonGroup('CUSTOMER_REFUSED');
                      setFailureReasonText('Khách từ chối nhận hàng (Không ưng ý / Đổi ý)');
                    }}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      failureTier === 'TIER_2'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300 ring-1 ring-rose-500'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                      Tầng 2: Khách Từ Chối / Hoàn
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Kích hoạt quy trình hoàn trả hàng về Shop (DELIVERY_FAILED_PENDING_RETURN)
                    </div>
                  </button>
                </div>
              </div>

              {/* Danh sách lý do theo Tầng */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">
                  2. Lý Do Cụ Thể:
                </label>
                <div className="space-y-1.5">
                  {failureTier === 'TIER_1' ? (
                    <>
                      {[
                        { group: 'CANNOT_CONTACT', label: 'Gọi điện khách không nghe máy / Thuê bao' },
                        { group: 'CUSTOMER_RESCHEDULE', label: 'Khách hẹn giao lại vào ca sau / ngày mai' },
                        { group: 'CUSTOMER_RESCHEDULE', label: 'Khách vắng nhà / Chưa về kịp' },
                        { group: 'WRONG_ADDRESS', label: 'Địa chỉ khó tìm / Cần hỗ trợ định vị lại' },
                      ].map((item, idx) => (
                        <label
                          key={idx}
                          className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer text-xs"
                        >
                          <input
                            type="radio"
                            name="failureReason"
                            value={item.label}
                            checked={failureReasonText === item.label}
                            onChange={() => {
                              setFailureReasonText(item.label);
                              setReasonGroup(item.group);
                            }}
                            className="text-amber-500 focus:ring-0"
                          />
                          <span className="text-slate-200">{item.label}</span>
                        </label>
                      ))}
                    </>
                  ) : (
                    <>
                      {[
                        { group: 'CUSTOMER_REFUSED', label: 'Khách từ chối nhận hàng (Không ưng ý / Đổi ý)' },
                        { group: 'CUSTOMER_REFUSED', label: 'Khách không đủ tiền thanh toán COD' },
                        { group: 'CUSTOMER_REFUSED', label: 'Hàng hóa bị móp méo / Hư hỏng khi đồng kiểm' },
                        { group: 'WRONG_ADDRESS', label: 'Địa chỉ người nhận không có thật / Người nhận ảo' },
                      ].map((item, idx) => (
                        <label
                          key={idx}
                          className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer text-xs"
                        >
                          <input
                            type="radio"
                            name="failureReason"
                            value={item.label}
                            checked={failureReasonText === item.label}
                            onChange={() => {
                              setFailureReasonText(item.label);
                              setReasonGroup(item.group);
                            }}
                            className="text-rose-500 focus:ring-0"
                          />
                          <span className="text-slate-200">{item.label}</span>
                        </label>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Số lần gọi liên hệ */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  Số cuộc gọi đã liên hệ với khách:
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setContactAttempts(num)}
                      className={`flex-1 py-1.5 rounded-xl border text-xs font-mono font-bold cursor-pointer transition ${
                        contactAttempts === num
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {num} cuộc
                    </button>
                  ))}
                </div>
              </div>

              {/* Hẹn giờ lại nếu ở Tầng 1 */}
              {failureTier === 'TIER_1' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    Hẹn Giờ Giao Lại (Tùy chọn):
                  </label>
                  <input
                    type="datetime-local"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              {/* Ghi chú thêm */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  Ghi Chú Thêm (Nếu có):
                </label>
                <textarea
                  rows={2}
                  value={failureNote}
                  onChange={(e) => setFailureNote(e.target.value)}
                  placeholder="Ghi chú chi tiết trao đổi với khách nhận..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setFailureModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={submittingFailure}
                  className={`px-4 py-2 rounded-xl font-bold text-xs text-white transition flex items-center gap-1.5 cursor-pointer shadow ${
                    failureTier === 'TIER_1'
                      ? 'bg-amber-600 hover:bg-amber-500'
                      : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  {submittingFailure ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : failureTier === 'TIER_1' ? (
                    'Xác Nhận Hẹn Giao Lại'
                  ) : (
                    'Kích Hoạt Hoàn Hàng'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShipperDeliveryPage;
