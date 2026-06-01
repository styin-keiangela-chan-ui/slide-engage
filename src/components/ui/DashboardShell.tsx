import { type ReactNode } from 'react';

export const dashboardPageClass = 'mx-auto w-full max-w-[1440px] px-5 py-6 sm:px-6 lg:px-8';
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
