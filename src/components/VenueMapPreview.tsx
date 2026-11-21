import React, { useMemo, useState } from 'react';
import {
  MapPin,
  Navigation,
  ExternalLink,
  Copy,
  Check,
  Plus,
  Minus,
  Layers,
  Compass,
  Crosshair,
} from 'lucide-react';
import { GeoCoordinates } from '../types/event';
import {
  buildVenueMapVisualization,
  formatCoordinates,
} from '../utils/eventUtils';

interface VenueMapPreviewProps {
  venue: string;
  address: string;
  city: string;
  coordinates?: GeoCoordinates | null;
}

export const VenueMapPreview: React.FC<VenueMapPreviewProps> = ({
  venue,
  address,
  city,
  coordinates = null,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [copiedTarget, setCopiedTarget] = useState<'address' | 'coords' | null>(null);
  const [mapStyle, setMapStyle] = useState<'cartographic' | 'coordinates'>('cartographic');

  const formattedCoords = useMemo(() => {
    return coordinates ? formatCoordinates(coordinates) : null;
  }, [coordinates]);

  const mapViz = useMemo(() => {
    if (!coordinates) return null;
    return buildVenueMapVisualization(coordinates, zoomLevel, `${venue} ${city}`);
  }, [coordinates, zoomLevel, venue, city]);

  const handleCopyAddress = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${venue}, ${address}`).catch(() => {});
      setCopiedTarget('address');
      setTimeout(() => setCopiedTarget(null), 2200);
    }
  };

  const handleCopyCoordinates = () => {
    if (!formattedCoords || !navigator.clipboard) return;
    navigator.clipboard.writeText(formattedCoords.rawPair).catch(() => {});
    setCopiedTarget('coords');
    setTimeout(() => setCopiedTarget(null), 2200);
  };

  const handleOpenDirections = () => {
    const query = coordinates
      ? `${coordinates.lat},${coordinates.lng}`
      : encodeURIComponent(`${venue}, ${address}`);
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${query}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(1.6, Number((prev + 0.2).toFixed(1))));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(0.8, Number((prev - 0.2).toFixed(1))));

  const offsetX = mapViz?.blockOffsetX ?? 0;
  const offsetY = mapViz?.blockOffsetY ?? 0;
  const curveShift = mapViz?.arterialCurveOffset ?? 0;

  return (
    <section
      aria-label={`Venue map and coordinates for ${venue}`}
      className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden shadow-xs"
    >
      {/* Map Header Toolbar */}
      <div className="px-4 py-2.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 font-bold text-stone-900 dark:text-stone-100">
          <MapPin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span>Venue Map & Coordinates</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() =>
              setMapStyle(mapStyle === 'cartographic' ? 'coordinates' : 'cartographic')
            }
            className="px-2.5 py-1 rounded text-[11px] font-medium text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
            aria-label="Toggle map view mode"
          >
            <Layers className="w-3 h-3" />
            <span>{mapStyle === 'cartographic' ? 'Grid View' : 'Street Map'}</span>
          </button>

          {formattedCoords && (
            <button
              type="button"
              onClick={handleCopyCoordinates}
              className="px-2.5 py-1 rounded text-[11px] font-medium text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
              aria-label={`Copy coordinates ${formattedCoords.rawPair}`}
            >
              {copiedTarget === 'coords' ? (
                <Check className="w-3 h-3 text-emerald-500" />
              ) : (
                <Crosshair className="w-3 h-3" />
              )}
              <span>{copiedTarget === 'coords' ? 'Coords Copied' : 'Copy Coords'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyAddress}
            className="px-2.5 py-1 rounded text-[11px] font-medium text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
            aria-label="Copy venue address"
          >
            {copiedTarget === 'address' ? (
              <Check className="w-3 h-3 text-emerald-500" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
            <span>{copiedTarget === 'address' ? 'Copied' : 'Copy Address'}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenDirections}
            className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center gap-1 cursor-pointer shadow-2xs whitespace-nowrap"
            aria-label="Open directions in external map"
          >
            <Navigation className="w-3 h-3" />
            <span>Directions</span>
            <ExternalLink className="w-2.5 h-2.5 ml-0.5 opacity-80" />
          </button>
        </div>
      </div>

      {/* Static Cartographic Vector Map + Coordinate Graticule */}
      <div className="relative h-64 sm:h-72 w-full bg-stone-100 dark:bg-stone-950 overflow-hidden select-none">
        {/* Scaled Architectural Map Canvas */}
        <div
          className="absolute inset-0 transition-transform duration-200 ease-out origin-center"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          <svg
            className="w-full h-full"
            viewBox="0 0 800 450"
            preserveAspectRatio="xMidYMid slice"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label={`Static map centered on ${venue} in ${city}${
              formattedCoords ? ` at ${formattedCoords.decimal}` : ''
            }`}
          >
            <defs>
              <pattern
                id="venue-grid-pattern"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.6"
                  className="text-stone-200 dark:text-stone-800/60"
                />
              </pattern>

              <linearGradient id="venue-water-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop
                  offset="0%"
                  className="text-sky-100 dark:text-sky-950/50"
                  stopColor="currentColor"
                />
                <stop
                  offset="100%"
                  className="text-blue-100 dark:text-blue-950/60"
                  stopColor="currentColor"
                />
              </linearGradient>

              <linearGradient id="venue-park-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop
                  offset="0%"
                  className="text-emerald-50 dark:text-emerald-950/35"
                  stopColor="currentColor"
                />
                <stop
                  offset="100%"
                  className="text-emerald-100 dark:text-emerald-950/45"
                  stopColor="currentColor"
                />
              </linearGradient>
            </defs>

            {/* Base Map Surface */}
            <rect width="800" height="450" className="fill-stone-50 dark:fill-stone-950" />
            <rect width="800" height="450" fill="url(#venue-grid-pattern)" />

            {mapStyle === 'cartographic' && (
              <>
                {/* Coastal / River Feature */}
                <path
                  d={`M 0,${240 + offsetY} C 180,${260 + curveShift} 280,${190 - curveShift} 480,${275 + offsetY} C 640,${330 - offsetY} 720,300 800,325 L 800,450 L 0,450 Z`}
                  fill="url(#venue-water-grad)"
                />

                {/* Civic Parkland Polygons */}
                <rect
                  x={525 + offsetX}
                  y={62 + offsetY}
                  width="170"
                  height="96"
                  rx="12"
                  fill="url(#venue-park-grad)"
                />
                <path
                  d={`M 75,345 C 165,305 250,358 370,316 C 435,295 510,338 565,325 L 515,398 L 110,415 Z`}
                  fill="url(#venue-park-grad)"
                />

                {/* Local Street Grid */}
                <g className="stroke-stone-200 dark:stroke-stone-800" strokeWidth="6" fill="none">
                  <path d="M 0,105 L 800,105" />
                  <path d="M 0,185 L 800,185" />
                  <path d="M 0,285 L 800,285" />
                  <path d="M 0,380 L 800,380" />
                  <path d="M 120,0 L 120,450" />
                  <path d="M 240,0 L 240,450" />
                  <path d="M 360,0 L 360,450" />
                  <path d="M 480,0 L 480,450" />
                  <path d="M 600,0 L 600,450" />
                  <path d="M 720,0 L 720,450" />
                </g>

                {/* Primary Boulevard */}
                <path
                  d={`M 0,${72 + offsetY} C 250,${105 + curveShift} 420,${215 - curveShift} 800,${175 + offsetY}`}
                  className="stroke-amber-300 dark:stroke-amber-700/60"
                  strokeWidth="8"
                  fill="none"
                />
                <path
                  d={`M 0,${72 + offsetY} C 250,${105 + curveShift} 420,${215 - curveShift} 800,${175 + offsetY}`}
                  className="stroke-white dark:stroke-stone-900"
                  strokeWidth="4"
                  fill="none"
                />

                {/* Civic Corridor */}
                <path
                  d={`M ${155 + offsetX},450 L ${555 + offsetX},0`}
                  className="stroke-indigo-200 dark:stroke-indigo-950/70"
                  strokeWidth="8"
                  fill="none"
                />
                <path
                  d={`M ${155 + offsetX},450 L ${555 + offsetX},0`}
                  className="stroke-white dark:stroke-stone-900"
                  strokeWidth="4"
                  fill="none"
                />

                {/* Urban Block Silhouettes */}
                <g className="fill-stone-200/75 dark:fill-stone-800/65">
                  <rect x={258 + offsetX} y={118 + offsetY} width="78" height="48" rx="3" />
                  <rect x={382 + offsetX} y={118 + offsetY} width="74" height="48" rx="3" />
                  <rect x={258 + offsetX} y={198 + offsetY} width="74" height="58" rx="3" />
                  <rect x={378 + offsetX} y={198 + offsetY} width="88" height="66" rx="3" />
                  <rect x={496 + offsetX} y={198 + offsetY} width="78" height="60" rx="3" />
                </g>
              </>
            )}

            {/* Latitude & Longitude Coordinate Graticule Overlay */}
            <g className="stroke-indigo-500/25 dark:stroke-indigo-400/25" strokeWidth="1" strokeDasharray="4 4">
              {/* Latitude Parallels at 20%, 50%, 80% */}
              <line x1="0" y1="90" x2="800" y2="90" />
              <line x1="0" y1="225" x2="800" y2="225" />
              <line x1="0" y1="360" x2="800" y2="360" />
              {/* Longitude Meridians at 20%, 50%, 80% */}
              <line x1="160" y1="0" x2="160" y2="450" />
              <line x1="400" y1="0" x2="400" y2="450" />
              <line x1="640" y1="0" x2="640" y2="450" />
            </g>

            {/* Target Center Coordinate Reticle */}
            <g className="stroke-indigo-600/50 dark:stroke-indigo-400/50" fill="none">
              <circle cx="400" cy="225" r="36" strokeWidth="1.25" strokeDasharray="3 3" />
              <circle cx="400" cy="225" r="14" strokeWidth="1.25" />
            </g>
          </svg>
        </div>

        {/* Graticule Coordinate Axis Labels Aligned to Exact 20% / 50% / 80% Grid Lines */}
        {mapViz && (
          <>
            <div className="hidden sm:block pointer-events-none z-10 text-[10px] font-mono tabular-nums text-stone-600 dark:text-stone-300">
              {mapViz.parallels.map((p, idx) => (
                <span
                  key={idx}
                  style={{ top: `${p.posPct}%` }}
                  className="absolute left-2.5 -translate-y-1/2 px-1.5 py-0.5 rounded bg-white/90 dark:bg-stone-900/90 border border-stone-200/80 dark:border-stone-800 shadow-2xs"
                >
                  {p.label}
                </span>
              ))}
              {mapViz.meridians.map((m, idx) => (
                <span
                  key={idx}
                  style={{ left: `${m.posPct}%` }}
                  className="absolute top-2.5 -translate-x-1/2 px-1.5 py-0.5 rounded bg-white/90 dark:bg-stone-900/90 border border-stone-200/80 dark:border-stone-800 shadow-2xs"
                >
                  {m.label}
                </span>
              ))}
            </div>
          </>
        )}

        {/* Venue Location Marker Centered at Exact Coordinate Intersection */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-10 flex flex-col items-center">
          <div className="bg-stone-900 text-white dark:bg-white dark:text-stone-900 text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg mb-1.5 border border-stone-700/60 dark:border-stone-200 flex items-center gap-2 whitespace-nowrap">
            <span className="max-w-[190px] sm:max-w-[260px] truncate">{venue}</span>
            {formattedCoords && (
              <span className="hidden md:inline font-mono text-[10px] font-normal text-indigo-300 dark:text-indigo-600 tabular-nums">
                {formattedCoords.rawPair}
              </span>
            )}
          </div>

          <div className="relative w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg border-2 border-white dark:border-stone-900">
            <MapPin className="w-4 h-4 fill-white" />
          </div>
          <div className="w-1.5 h-1.5 bg-indigo-600 rotate-45 -mt-1 shadow-xs" />
        </div>

        {/* Top-Right Compact Compass Orientation */}
        <div
          className="absolute top-2.5 right-2.5 z-20 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md px-2 py-1 rounded-md border border-stone-200/80 dark:border-stone-800 text-[10px] font-mono text-stone-700 dark:text-stone-300 flex items-center gap-1 shadow-2xs"
          aria-label="North orientation"
        >
          <Compass className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>N</span>
        </div>

        {/* Bottom-Right Map Scale & Zoom Controls */}
        <div className="absolute bottom-2.5 right-2.5 z-20 flex items-end gap-2">
          {mapViz && (
            <div className="bg-white/90 dark:bg-stone-900/90 backdrop-blur-md px-2 py-1 rounded-md border border-stone-200 dark:border-stone-800 text-[10px] font-mono text-stone-700 dark:text-stone-300 flex items-center gap-1.5 shadow-xs tabular-nums">
              <span className="inline-block w-7 h-1 border-x border-b border-indigo-600 dark:border-indigo-400" />
              <span>{mapViz.scaleLabel}</span>
            </div>
          )}

          <div className="flex flex-col items-center gap-1 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md rounded-lg p-1 border border-stone-200 dark:border-stone-800 shadow-md">
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 1.6}
              className="p-1.5 rounded hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 disabled:opacity-40 transition-colors cursor-pointer"
              aria-label="Zoom in map"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <div className="w-4 h-[1px] bg-stone-200 dark:bg-stone-800" />
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 0.8}
              className="p-1.5 rounded hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 disabled:opacity-40 transition-colors cursor-pointer"
              aria-label="Zoom out map"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Dedicated Coordinate Telemetry Strip */}
      <div className="px-4 py-2.5 bg-stone-900 dark:bg-stone-950 text-stone-100 border-t border-stone-800 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
        {formattedCoords ? (
          <>
            <div className="flex items-center gap-2 min-w-0">
              <Crosshair className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span
                data-testid="venue-coordinates-decimal"
                className="font-mono font-semibold tabular-nums text-white"
              >
                {formattedCoords.decimal}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-stone-300 tabular-nums">
              <span>{formattedCoords.dms}</span>
              <span className="text-stone-600" aria-hidden="true">
                ·
              </span>
              <span className="text-indigo-300">{city}</span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 font-mono text-[11px] text-stone-300">
            <Crosshair className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>Address Reference · {city}</span>
          </div>
        )}
      </div>

      {/* Address & External Directions Line */}
      <div className="p-3.5 bg-stone-50/80 dark:bg-stone-900/40 border-t border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0 text-stone-600 dark:text-stone-300">
          <div className="flex items-center gap-1.5 min-w-0">
            <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span className="font-semibold text-stone-900 dark:text-stone-100 truncate">
              {venue}
            </span>
          </div>
          <span className="hidden sm:inline text-stone-400" aria-hidden="true">
            ·
          </span>
          <span className="text-stone-500 dark:text-stone-400 truncate">{address}</span>
        </div>

        <button
          type="button"
          onClick={handleOpenDirections}
          className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-1 shrink-0 self-start sm:self-auto cursor-pointer whitespace-nowrap"
        >
          <span>Open in Google Maps</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </section>
  );
};
