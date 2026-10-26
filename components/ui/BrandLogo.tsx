import React from "react";

export interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function BrandLogo({ className = "", size = "md" }: BrandLogoProps) {
  const dimensions =
    size === "sm"
      ? "h-8 w-8 rounded-lg"
      : size === "lg"
        ? "h-14 w-14 rounded-2xl"
        : "h-10 w-10 rounded-xl";

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-[#F43F5E] via-[#E11D48] to-[#9F1239] shadow-md shadow-[#E11D48]/25 ring-1 ring-white/15 ${dimensions} ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-4/5 w-4/5"
      >
        <circle cx="256" cy="136" r="24" fill="#FFFFFF" />
        <path
          d="M124 274C124 201.098 183.098 142 256 142C328.902 142 388 201.098 388 274H124Z"
          fill="#FFFFFF"
        />
        <rect x="104" y="298" width="304" height="32" rx="16" fill="#FFFFFF" />
        <rect
          x="144"
          y="356"
          width="132"
          height="24"
          rx="12"
          fill="#FFFFFF"
          fillOpacity="0.92"
        />
        <rect
          x="144"
          y="398"
          width="90"
          height="24"
          rx="12"
          fill="#FFFFFF"
          fillOpacity="0.72"
        />
        <rect
          x="306"
          y="352"
          width="70"
          height="70"
          rx="16"
          stroke="#FFFFFF"
          strokeWidth="18"
        />
        <rect x="330" y="376" width="22" height="22" rx="5" fill="#FFFFFF" />
      </svg>
    </div>
  );
}
