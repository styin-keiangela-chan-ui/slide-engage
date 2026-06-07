'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

type SETooltipProps = {
  text: string;
  children: ReactNode;
  position?: TooltipPosition;
  className?: string;
};

export default function SETooltip({ text, children, position = 'top', className = '' }: SETooltipProps) {
  const wrapperRef = useRef<HTMLSpanElement | null>(null);
  const tooltipRef = useRef<HTMLSpanElement | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(false);
  const [placement, setPlacement] = useState<TooltipPosition>(position);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!visible) return;

    function placeTooltip() {
      const anchor = wrapperRef.current;
      const tooltip = tooltipRef.current;
      if (!anchor || !tooltip) return;

      const gap = 10;
      const edge = 8;
      const rect = anchor.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      const width = tooltipRect.width || 120;
      const height = tooltipRect.height || 34;

      const placementOptions: TooltipPosition[] = [
        position,
        'bottom',
        'top',
        'right',
        'left',
      ];
      const candidates = placementOptions.filter((item, index, array) => array.indexOf(item) === index);

      function nextCoords(nextPlacement: TooltipPosition) {
        if (nextPlacement === 'bottom') {
          return { top: rect.bottom + gap, left: rect.left + rect.width / 2 - width / 2 };
        }
        if (nextPlacement === 'left') {
          return { top: rect.top + rect.height / 2 - height / 2, left: rect.left - width - gap };
        }
        if (nextPlacement === 'right') {
          return { top: rect.top + rect.height / 2 - height / 2, left: rect.right + gap };
        }
        return { top: rect.top - height - gap, left: rect.left + rect.width / 2 - width / 2 };
      }

      const chosen = candidates.find(candidate => {
        const point = nextCoords(candidate);
        return (
          point.top >= edge &&
          point.left >= edge &&
          point.top + height <= window.innerHeight - edge &&
          point.left + width <= window.innerWidth - edge
        );
      }) || position;

      const point = nextCoords(chosen);
      setPlacement(chosen);
      setCoords({
        top: Math.max(edge, Math.min(point.top, window.innerHeight - height - edge)),
        left: Math.max(edge, Math.min(point.left, window.innerWidth - width - edge)),
      });
    }

    const frame = window.requestAnimationFrame(placeTooltip);
    window.addEventListener('resize', placeTooltip);
    window.addEventListener('scroll', placeTooltip, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', placeTooltip);
      window.removeEventListener('scroll', placeTooltip, true);
    };
  }, [position, visible]);

  function clearPressTimer() {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }

  function show() {
    setVisible(true);
  }

  function hide() {
    clearPressTimer();
    setVisible(false);
  }

  function startLongPress() {
    clearPressTimer();
    pressTimer.current = setTimeout(show, 500);
  }

  const arrowClasses: Record<TooltipPosition, string> = {
    top: 'left-1/2 top-full -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-[#1F2933]',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-[#1F2933]',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-[#1F2933]',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-[#1F2933]',
  };

  return (
    <span
      ref={wrapperRef}
      className={`relative inline-flex ${className}`}
      aria-label={text}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocusCapture={show}
      onBlurCapture={hide}
      onTouchStart={startLongPress}
      onTouchEnd={hide}
      onTouchCancel={hide}
    >
      {children}
      {mounted && createPortal(
        <span
          ref={tooltipRef}
          role="tooltip"
          style={{ top: coords.top, left: coords.left }}
          className={`pointer-events-none fixed z-[99999] max-w-[240px] rounded-[8px] bg-[#1F2933] px-2.5 py-1.5 text-xs font-bold leading-tight text-white shadow-lg transition-all duration-150 ${
            visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
        >
          {text}
          <span className={`absolute h-0 w-0 border-4 ${arrowClasses[placement]}`} />
        </span>,
        document.body
      )}
    </span>
  );
}
