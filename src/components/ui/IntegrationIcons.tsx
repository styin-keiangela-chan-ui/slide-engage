type IntegrationIconProps = {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
};

const sizes = {
  sm: 'h-5 w-5',
  md: 'h-[56px] w-[56px]',
  lg: 'h-16 w-16',
};

export function PowerPointIcon({ className = '', size = 'md' }: IntegrationIconProps) {
  return (
    <span className={`relative inline-block ${sizes[size]} ${className}`} aria-hidden="true">
      <span className="absolute inset-0 rounded-full bg-white shadow-[0_8px_24px_rgba(15,23,42,0.14)]" />
      <span className="absolute left-[32%] top-[21%] h-[58%] w-[58%] rounded-full bg-[#D94D2B]">
        <span className="absolute right-0 top-0 h-1/2 w-1/2 rounded-tr-full bg-[#FF8B6B]" />
      </span>
      <span className="absolute left-[17%] top-[34%] flex h-[48%] w-[54%] items-center justify-center rounded-[10%] bg-[#C83B1C] text-[0.45em] font-black text-white shadow-[4px_5px_10px_rgba(120,30,10,0.25)]">
        P
      </span>
    </span>
  );
}

export function GoogleSlidesIcon({ className = '', size = 'md' }: IntegrationIconProps) {
  return (
    <span className={`relative inline-block ${sizes[size]} ${className}`} aria-hidden="true">
      <span className="absolute left-[25%] top-[10%] h-[78%] w-[52%] rounded-[9%] bg-[#F6B800] shadow-sm">
        <span className="absolute right-0 top-0 h-[28%] w-[32%] rounded-bl-[18%] bg-[#FFE08A] [clip-path:polygon(0_0,100%_100%,100%_0)]" />
        <span className="absolute left-1/2 top-[51%] h-[25%] w-[45%] -translate-x-1/2 rounded-[8%] bg-white">
          <span className="absolute inset-[24%] rounded-[6%] bg-[#F6B800]" />
        </span>
      </span>
    </span>
  );
}
