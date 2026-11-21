import React, { useRef, useState } from 'react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { RegistrationRecord } from '../types/event';
import { generateQRCodeData, generateQRCodeCheckinURL } from '../utils/eventUtils';
import { Download, Check, Copy } from 'lucide-react';

interface TicketQRCodeProps {
  ticket: RegistrationRecord;
  size?: number;
  showControls?: boolean;
  compact?: boolean;
  exportLabel?: string;
  onExported?: () => void;
}

/**
 * Renders a branded ticket pass PNG with QR code and event/attendee details,
 * and triggers a file download on the user's device.
 */
export function exportBrandedTicketQRPng(
  sourceCanvas: HTMLCanvasElement,
  ticket: RegistrationRecord
): boolean {
  const brandedCanvas = document.createElement('canvas');
  const ctx = brandedCanvas.getContext('2d');
  if (!ctx) return false;

  const width = Math.max(sourceCanvas.width + 80, 420);
  const headerHeight = 64;
  const qrPaddingTop = 24;
  const qrSize = sourceCanvas.width;
  const detailsHeight = 136;
  const height = headerHeight + qrPaddingTop + qrSize + detailsHeight;

  brandedCanvas.width = width;
  brandedCanvas.height = height;

  // Card background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Header band
  ctx.fillStyle = '#4f46e5';
  ctx.fillRect(0, 0, width, headerHeight);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px "Plus Jakarta Sans", "DM Sans", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('EventPulse Digital Pass', 24, 30);

  ctx.fillStyle = '#e0e7ff';
  ctx.font = '12px monospace';
  ctx.fillText(ticket.ticketCode, 24, 48);

  // Center QR code
  const qrX = Math.round((width - qrSize) / 2);
  const qrY = headerHeight + qrPaddingTop;
  ctx.drawImage(sourceCanvas, qrX, qrY);

  // Divider line
  const infoStartY = qrY + qrSize + 24;
  ctx.strokeStyle = '#e7e5e4';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(24, infoStartY - 12);
  ctx.lineTo(width - 24, infoStartY - 12);
  ctx.stroke();

  // Event title
  ctx.fillStyle = '#1c1917';
  ctx.font = 'bold 15px "Plus Jakarta Sans", "DM Sans", sans-serif';
  ctx.textAlign = 'center';
  const maxTitleLen = 40;
  const titleText =
    ticket.eventTitle.length > maxTitleLen
      ? `${ticket.eventTitle.substring(0, maxTitleLen - 2)}...`
      : ticket.eventTitle;
  ctx.fillText(titleText, width / 2, infoStartY + 12);

  // Date & venue
  ctx.fillStyle = '#57534e';
  ctx.font = '12px "DM Sans", sans-serif';
  ctx.fillText(ticket.eventDate, width / 2, infoStartY + 34);

  const venueText = `${ticket.eventVenue}, ${ticket.eventCity}`;
  const trimmedVenue = venueText.length > 48 ? `${venueText.substring(0, 45)}...` : venueText;
  ctx.fillText(trimmedVenue, width / 2, infoStartY + 54);

  // Attendee & tier
  ctx.fillStyle = '#4f46e5';
  ctx.font = 'bold 12px "DM Sans", sans-serif';
  ctx.fillText(
    `${ticket.fullName} · ${ticket.ticketType} (${ticket.ticketCount}x)`,
    width / 2,
    infoStartY + 80
  );

  // Status line
  ctx.fillStyle = '#047857';
  ctx.font = '11px monospace';
  ctx.fillText(`STATUS: ${ticket.status.toUpperCase()}`, width / 2, infoStartY + 100);

  const dataUrl = brandedCanvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `EventPulse-QR-${ticket.ticketCode}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  return true;
}

export const TicketQRCode: React.FC<TicketQRCodeProps> = ({
  ticket,
  size = 180,
  showControls = true,
  compact = false,
  exportLabel = 'Save QR PNG',
  onExported,
}) => {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Generate payload
  const qrData = generateQRCodeData(ticket);
  const checkinUrl = generateQRCodeCheckinURL(ticket);

  // Function to download actual PNG image from hidden QRCodeCanvas
  const handleDownloadPNG = () => {
    try {
      setDownloading(true);
      const canvas = canvasRef.current?.querySelector('canvas');
      if (!canvas) {
        setDownloading(false);
        return;
      }

      const exported = exportBrandedTicketQRPng(canvas, ticket);
      if (exported && onExported) {
        onExported();
      }
    } catch (err) {
      console.error('Failed to export QR PNG:', err);
    } finally {
      setTimeout(() => setDownloading(false), 500);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(checkinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (compact) {
    return (
      <div className="relative inline-flex flex-col items-center p-2 rounded-xl bg-white border border-stone-200 dark:border-stone-700 shadow-2xs">
        <QRCodeSVG
          value={qrData}
          size={size}
          level="M"
          marginSize={2}
          fgColor="#09090b"
          bgColor="#ffffff"
        />
        <div className="text-[9px] font-mono font-semibold text-stone-600 mt-1">
          {ticket.ticketCode}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center space-y-3">
      {/* Hidden canvas for high-res PNG export */}
      <div ref={canvasRef} className="hidden" aria-hidden="true">
        <QRCodeCanvas
          value={qrData}
          size={size * 2} // 2x density for sharp export
          level="H"
          marginSize={2}
          fgColor="#09090b"
          bgColor="#ffffff"
        />
      </div>

      {/* Scannable Card with Viewfinder Frame */}
      <div className="relative p-4 sm:p-5 bg-white rounded-2xl border-2 border-stone-200 dark:border-stone-700 shadow-md transition-transform duration-200 hover:scale-[1.01]">
        {/* Optical Scanner Corner Brackets */}
        <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-indigo-600 rounded-tl-sm pointer-events-none" />
        <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-indigo-600 rounded-tr-sm pointer-events-none" />
        <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-indigo-600 rounded-bl-sm pointer-events-none" />
        <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-indigo-600 rounded-br-sm pointer-events-none" />

        {/* Dynamic SVG QR code */}
        <div className="relative bg-white flex items-center justify-center p-1 rounded-lg">
          <QRCodeSVG
            value={qrData}
            size={size}
            level="H"
            marginSize={2}
            fgColor="#09090b"
            bgColor="#ffffff"
            title={`Check-in QR Code for ${ticket.ticketCode}`}
          />
        </div>

        {/* Live Scan Status Strip */}
        <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-center gap-1.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-xs ring-2 ring-emerald-200" />
          <span>Active Gate Scan Pass</span>
        </div>
      </div>

      {/* Ticket Details Subtext */}
      <div className="space-y-0.5">
        <div className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
          {ticket.ticketCode}
        </div>
        <p className="text-[11px] text-stone-500 dark:text-stone-400">
          Present at security check-in for instant verification
        </p>
      </div>

      {/* Control Buttons */}
      {showControls && (
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1 w-full max-w-xs">
          <button
            type="button"
            onClick={handleDownloadPNG}
            disabled={downloading}
            className="flex-1 py-1.5 px-3 text-xs font-medium rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 whitespace-nowrap"
            title="Download QR code image as PNG to camera roll or desktop"
          >
            <Download className="w-3.5 h-3.5 text-stone-500" />
            <span>{downloading ? 'Saving...' : exportLabel}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyCode}
            className="flex-1 py-1.5 px-3 text-xs font-medium rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            title="Copy verification check-in link"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-stone-500" />
                <span>Copy Link</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
