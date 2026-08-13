import React from 'react';

interface QRCodeSVGProps {
  value: string;
  size?: number;
  className?: string;
}

export const QRCodeSVG: React.FC<QRCodeSVGProps> = ({ value, size = 90, className = '' }) => {
  const cleanVal = encodeURIComponent((value || 'ELG-WAYBILL').trim());
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${cleanVal}&margin=2`;

  return (
    <div className={`flex flex-col items-center justify-center p-1 bg-white border border-slate-900 rounded-lg shrink-0 ${className}`}>
      <img
        src={qrUrl}
        alt={`QR Code ${value}`}
        width={size}
        height={size}
        className="block rounded object-contain"
        loading="eager"
      />
    </div>
  );
};
