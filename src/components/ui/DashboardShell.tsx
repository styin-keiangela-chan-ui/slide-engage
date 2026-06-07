import { type ReactNode } from 'react';

export const dashboardPageClass = 'mx-auto w-full max-w-[1280px] px-4 py-5 sm:px-5 lg:px-6';
export const dashboardCardClass = 'rounded-[18px] border border-[#DDE8E1] bg-white shadow-[0_14px_36px_rgba(15,23,42,0.04)]';

export default function DashboardShell({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${dashboardPageClass} ${className}`}>
      {children}
    </div>
  );
}
