'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

type SETooltipProps = {
  text: string;
  children: ReactNode;
  position?: TooltipPosition;
  className?: string;
};

export default function SETooltip({ text, children, position = 'top', className = '' }: SETooltipProps) {
  const wrapperRef = useRef<HTMLSpanElement | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(false);
  const [placement, setPlacement] = useState<TooltipPosition>(position);

  useEffect(() => {
    if (!visible || !wrapperRef.current) return;

    const rect = wrapperRef.current.getBoundingClientRect();
    const space = {
      top: rect.top,
      bottom: window.innerHeight - rect.bottom,
      left: rect.left,
      right: window.innerWidth - rect.right,
    };

    if (position === 'top' && space.top < 48 && space.bottom > space.top) setPlacement('bottom');
    else if (position === 'bottom' && space.bottom < 48 && space.top > space.bottom) setPlacement('top');
    else if (position === 'left' && space.left < 160 && space.right > space.left) setPlacement('right');
    else if (position === 'right' && space.right < 160 && space.left > space.right) setPlacement('left');
    else setPlacement(position);
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

  const placementClasses: Record<TooltipPosition, string> = {
    top: 'bottom-full left-1/2 mb-2 -translate-x-1/2',
    bottom: 'left-1/2 top-full mt-2 -translate-x-1/2',
    left: 'right-full top-1/2 mr-2 -translate-y-1/2',
    right: 'left-full top-1/2 ml-2 -translate-y-1/2',
  };

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
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-[9999] max-w-[240px] whitespace-nowrap rounded-[8px] bg-[#1F2933] px-2.5 py-1.5 text-xs font-bold leading-tight text-white shadow-lg transition-all duration-200 ${
          visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        } ${placementClasses[placement]}`}
      >
        {text}
        <span className={`absolute h-0 w-0 border-4 ${arrowClasses[placement]}`} />
      </span>
    </span>
  );
}
