'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface PreviewImage {
  id: string;
  url: string;
}

interface ImagePreviewLightboxProps {
  images: PreviewImage[];
  initialIndex: number;
  onClose: () => void;
}

export function ImagePreviewLightbox({ images, initialIndex, onClose }: ImagePreviewLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const [mounted, setMounted] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const syncFrameSize = useCallback(() => {
    const img = imgRef.current;
    const frame = frameRef.current;
    if (!img || !frame) return;
    frame.style.width = `${img.offsetWidth}px`;
    frame.style.height = `${img.offsetHeight}px`;
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

  return createPortal(
    <div
      className="fixed inset-0 z-20 flex items-center justify-center"
      style={{ paddingTop: '68px', paddingBottom: '16px' }}
      onClick={onClose}
    >
      {/* 半透明遮罩：与主题色一致，避免纯黑底 */}
      <div
        className="absolute inset-0 -z-10"
        style={{ backgroundColor: 'rgba(74, 55, 40, 0.72)' }}
        aria-hidden
      />

      {/* 紧贴图片尺寸的容器，按钮相对图片定位 */}
      <div
        ref={frameRef}
        className="relative animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          ref={imgRef}
          src={current.url}
          alt=""
          onLoad={syncFrameSize}
          className="block max-w-[min(calc(100vw-80px),1100px)] max-h-[calc(100vh-100px)] w-auto h-auto rounded-lg select-none"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.35)' }}
          draggable={false}
        />

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
