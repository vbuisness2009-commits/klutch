import React from "react";

type LogoProps = {
  className?: string;
  size?: number;
  showWordmark?: boolean;
};

/**
 * Klutch logo — a bold, angular K monogram in electric mint.
 * v1 refinement: the two diagonals are now one continuous mitered path
 * that meets the vertical bar at its right edge, so the vertex reads as
 * a single sharp point instead of two overlapping stroke ends.
 */
export function Logo({ className = "", size = 30, showWordmark = true }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="klutchMintGrad" x1="0" y1="0" x2="0.6" y2="1">
            <stop offset="0%" stopColor="#B8FFE5" />
            <stop offset="55%" stopColor="#3DFFC1" />
            <stop offset="100%" stopColor="#00E89B" />
          </linearGradient>
        </defs>

        {/* Vertical bar */}
        <rect x="3" y="3" width="7" height="26" rx="1.5" fill="url(#klutchMintGrad)" />

        {/* Continuous K arm: top-right → vertex → bottom-right, mitered */}
        <path
          d="M 28 3 L 10 16 L 28 29"
          fill="none"
          stroke="url(#klutchMintGrad)"
          strokeWidth="7"
          strokeLinejoin="miter"
          strokeMiterlimit={6}
          strokeLinecap="butt"
        />
      </svg>
      {showWordmark && (
        <span className="font-display text-[18px] font-black tracking-tight leading-none">
          Klutch
        </span>
      )}
    </div>
  );
}
