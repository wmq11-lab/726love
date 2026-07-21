'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface PreviewMedia {
  id: string;
  url: string;
  mediaType?: 'image' | 'video';
}

interface ImagePreviewLightboxProps {
  images: PreviewMedia[];
  initialIndex: number;
  onClose: () => void;
}

export function ImagePreviewLightbox({ images, initialIndex, onClose }: ImagePreviewLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const [mounted, setMounted] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLImageElement | HTMLVideoElement>(null);

  const syncFrameSize = useCallback(() => {
    const media = mediaRef.current;
    const frame = frameRef.current;
    if (!media || !frame) return;
    frame.style.width = `${media.offsetWidth}px`;
    frame.style.height = `${media.offsetHeight}px`;
  }, []);

  const goPrev = useCallback(() => {
    setIndex((i) => (i > 0 ? i - 1 : images.length - 1));
  }, [images.length]);

  const goNext = useCallback(() => {
    setIndex((i) => (i < images.length - 1 ? i + 1 : 0));
  }, [images.length]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    syncFrameSize();
  }, [index, syncFrameSize]);

  useEffect(() => {
    const onResize = () => syncFrameSize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [syncFrameSize]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, goPrev, goNext]);

  const current = images[index];
  if (!mounted || !current) return null;

  const isVideo = current.mediaType === 'video';

  return createPortal(
    <div
      className="fixed inset-0 z-20 flex items-center justify-center"
      style={{ paddingTop: '68px', paddingBottom: '16px' }}
      onClick={onClose}
    >
      <div
        className="absolute inset-0 -z-10"
        style={{ backgroundColor: 'rgba(74, 55, 40, 0.72)' }}
        aria-hidden
      />

      <div
        ref={frameRef}
        className="relative animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {isVideo ? (
          <video
            key={current.id}
            ref={mediaRef as React.RefObject<HTMLVideoElement>}
            src={current.url}
            controls
            playsInline
            autoPlay
            onLoadedData={syncFrameSize}
            className="block max-w-[min(calc(100vw-80px),1100px)] max-h-[calc(100vh-100px)] w-auto h-auto rounded-lg"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.35)', backgroundColor: '#1a120c' }}
          />
        ) : (
          <img
            key={current.id}
            ref={mediaRef as React.RefObject<HTMLImageElement>}
            src={current.url}
            alt=""
            onLoad={syncFrameSize}
            className="block max-w-[min(calc(100vw-80px),1100px)] max-h-[calc(100vh-100px)] w-auto h-auto rounded-lg select-none"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.35)' }}
            draggable={false}
          />
        )}

        <button
          type="button"
          onClick={onClose}
          className="absolute top-0 right-0 z-10 flex h-8 w-8 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full shadow-md"
          style={{ backgroundColor: 'rgba(255,255,255,0.95)', color: '#4A3728' }}
          aria-label="关闭"
        >
          <X size={16} />
        </button>

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-0 top-1/2 z-10 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-md"
              style={{ backgroundColor: 'rgba(255,255,255,0.95)', color: '#4A3728' }}
              aria-label="上一张"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              type="button"
              onClick={goNext}
              className="absolute right-0 top-1/2 z-10 flex h-8 w-8 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-md"
              style={{ backgroundColor: 'rgba(255,255,255,0.95)', color: '#4A3728' }}
              aria-label="下一张"
            >
              <ChevronRight size={18} />
            </button>

            <div
              className="absolute bottom-0 left-1/2 z-10 -translate-x-1/2 translate-y-1/2 rounded-full px-2.5 py-0.5 text-xs"
              style={{ backgroundColor: 'rgba(0,0,0,0.55)', color: '#FFFFFF' }}
            >
              {index + 1} / {images.length}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
