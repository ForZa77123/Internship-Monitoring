"use client";

import { useState, useEffect, useRef } from "react";
import {
  Video,
  VideoOff,
  Maximize2,
  RotateCcw,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const STREAM_SERVER_URL =
  process.env.NEXT_PUBLIC_STREAM_SERVER_URL || "http://127.0.0.1:5001";

export function LiveCameraFeed() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [streamOnline, setStreamOnline] = useState(true);
  const [streamRetryKey, setStreamRetryKey] = useState(0);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const videoContainerRef = useRef<HTMLDivElement | null>(null);

  // Auto-reconnect stream CCTV setiap 5 detik jika terputus
  useEffect(() => {
    if (streamOnline || isCollapsed) return;
    const retryTimer = setInterval(() => {
      setStreamOnline(true);
      setStreamRetryKey((prev) => prev + 1);
    }, 5000);
    return () => clearInterval(retryTimer);
  }, [streamOnline, isCollapsed]);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(4, +(prev + 0.25).toFixed(2)));
  };

  const handleZoomOut = () => {
    setZoom((prev) => {
      const next = Math.max(1, +(prev - 0.25).toFixed(2));
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleWheelZoom = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    setZoom((prev) => {
      const next = Math.min(4, Math.max(1, +(prev + delta).toFixed(2)));
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || zoom <= 1) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDoubleClick = () => {
    if (zoom > 1) {
      handleResetZoom();
    } else {
      setZoom(2);
    }
  };

  const handleToggleFullscreen = () => {
    if (!videoContainerRef.current) return;
    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleManualReconnectStream = () => {
    setStreamOnline(true);
    setStreamRetryKey((prev) => prev + 1);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 mb-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary">
            {streamOnline ? (
              <Video className="w-4 h-4" />
            ) : (
              <VideoOff className="w-4 h-4 text-rose-500" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-semibold text-foreground">
                Live Camera Feed — Head-Anchor ROI
              </h2>
              {streamOnline ? (
                <Badge variant="active" className="gap-1.5 text-[10px] px-2 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  LIVE
                </Badge>
              ) : (
                <Badge variant="away" className="gap-1.5 text-[10px] px-2 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  OFFLINE
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Stream deteksi fisik kamera AI secara real-time ({STREAM_SERVER_URL})
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isCollapsed && (
            <div className="flex items-center gap-1 bg-secondary/70 border border-border p-1 rounded-lg">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 1}
                title="Perkecil (Zoom Out)"
                className="px-2.5 py-1 rounded-md text-xs font-bold bg-card hover:bg-secondary disabled:opacity-40 text-foreground border border-border/60 transition cursor-pointer"
              >
                −
              </button>
              <span className="px-2 text-xs font-mono font-semibold text-primary min-w-[48px] text-center">
                {zoom.toFixed(2)}x
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 4}
                title="Perbesar (Zoom In)"
                className="px-2.5 py-1 rounded-md text-xs font-bold bg-card hover:bg-secondary disabled:opacity-40 text-foreground border border-border/60 transition cursor-pointer"
              >
                +
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                disabled={zoom === 1 && pan.x === 0 && pan.y === 0}
                title="Reset Posisi & Zoom"
                className="px-2.5 py-1 rounded-md text-xs bg-card hover:bg-secondary disabled:opacity-40 text-foreground border border-border/60 transition cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
              <button
                type="button"
                onClick={handleToggleFullscreen}
                title="Layar Penuh (Fullscreen)"
                className="px-2.5 py-1 rounded-md text-xs bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 transition cursor-pointer flex items-center gap-1 font-medium"
              >
                <Maximize2 className="w-3 h-3" />
                Fullscreen
              </button>
              <button
                type="button"
                onClick={handleManualReconnectStream}
                title="Muat Ulang Stream (↻)"
                className="px-2.5 py-1 rounded-md text-xs bg-card hover:bg-secondary text-foreground border border-border/60 transition cursor-pointer"
              >
                ↻
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-secondary/50 hover:bg-secondary text-xs font-medium text-foreground transition-colors cursor-pointer"
          >
            {isCollapsed ? (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                Tampilkan Kamera
              </>
            ) : (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                Sembunyikan Kamera
              </>
            )}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div
          ref={videoContainerRef}
          onWheel={handleWheelZoom}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDoubleClick={handleDoubleClick}
          className={`relative mt-3 rounded-xl overflow-hidden border border-border aspect-video max-h-[480px] w-full bg-black flex items-center justify-center select-none ${
            zoom > 1 ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in"
          }`}
        >
          {streamOnline ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={streamRetryKey}
                src={`${STREAM_SERVER_URL}/video_feed?t=${streamRetryKey}`}
                alt="CCTV AI Feed"
                draggable={false}
                onError={() => setStreamOnline(false)}
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: "center center",
                  transition: isDragging ? "none" : "transform 0.12s ease-out",
                }}
                className="w-full h-full object-contain pointer-events-none"
              />

              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                <span className="px-2.5 py-1 rounded-lg bg-slate-950/75 backdrop-blur border border-slate-800 text-[11px] text-slate-200">
                  {zoom > 1
                    ? "Klik & tahan untuk menggeser (Drag) • Double-click untuk reset"
                    : "Scroll mouse atau double-click pada video untuk Zoom"}
                </span>
                {zoom > 1 && (
                  <span className="px-2.5 py-1 rounded-lg bg-blue-600/85 backdrop-blur text-[11px] font-mono font-bold text-white">
                    ZOOM {zoom.toFixed(2)}x
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">
                  Stream Video Terputus / Belum Aktif
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Pastikan <code className="text-amber-400">core_monitoring.py</code> sedang berjalan di Port 5001.
                </p>
                <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Mencoba menghubungkan ulang otomatis setiap 5 detik...
                </p>
              </div>
              <button
                type="button"
                onClick={handleManualReconnectStream}
                className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition cursor-pointer"
              >
                Coba Hubungkan Sekarang
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
