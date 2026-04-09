import React from 'react';

interface BaseballGloveIconProps {
  className?: string;
  size?: number;
}

export const BaseballGloveIcon: React.FC<BaseballGloveIconProps> = ({ className, size = 24 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Glove body */}
    <path d="M4 13c0 4.5 3.5 8 8 8s6-2 6-5c0-1.5-.5-3-2-4" />
    {/* Thumb */}
    <path d="M4 13c0-2 1-4 3-5" />
    {/* Fingers */}
    <path d="M7 8V4a1 1 0 0 1 2 0v5" />
    <path d="M9 9V3a1 1 0 0 1 2 0v6" />
    <path d="M11 9V3a1 1 0 0 1 2 0v6" />
    <path d="M13 8V4a1 1 0 0 1 2 0v4" />
    {/* Pocket webbing */}
    <path d="M16 8c1 1 2 2.5 2 5" />
    {/* Pocket stitching */}
    <path d="M8 14c1.5 1 4 1 5.5 0" />
  </svg>
);
