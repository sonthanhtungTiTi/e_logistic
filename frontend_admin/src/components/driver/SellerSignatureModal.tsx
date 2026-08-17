import React, { useRef, useState, useEffect } from 'react';
import { PenTool, RotateCcw, CheckCircle2, X, FileCheck } from 'lucide-react';

interface SellerSignatureModalProps {
  trackingCode?: string;
  orderCount?: number;
  onConfirm: (signatureBase64: string) => void;
  onClose: () => void;
}

export const SellerSignatureModal: React.FC<SellerSignatureModalProps> = ({
  trackingCode,
  orderCount,
  onConfirm,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset canvas resolution
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    ctx.strokeStyle = '#0284c7'; // Cyan/Blue stroke
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSigned(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSigned) return;
    const dataUrl = canvas.toDataURL('image/png');
    onConfirm(dataUrl);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white">Chữ Ký Xác Nhận (ePOH)</h3>
              <p className="text-[11px] text-cyan-400 font-mono">
                {orderCount && orderCount > 1 ? `Lô bàn giao: ${orderCount} đơn hàng` : `Đơn hàng: ${trackingCode}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Instruction */}
        <p className="text-xs text-slate-300">
          Vui lòng đưa thiết bị cho <strong className="text-white">Seller (Chủ hàng)</strong> ký xác nhận giao kiện hàng bên dưới:
        </p>

        {/* Signature Canvas Box */}
        <div className="relative bg-slate-950 border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-2xl overflow-hidden touch-none">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full h-44 cursor-crosshair block"
          />

          {!hasSigned && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-600 space-y-1">
              <PenTool className="w-7 h-7" />
              <span className="text-xs font-semibold">Ký tên trực tiếp tại đây</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleClear}
            className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" /> Ký lại
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!hasSigned}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" /> Xác Nhận & Hoàn Tất
          </button>
        </div>

      </div>
    </div>
  );
};
