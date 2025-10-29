// Central branding configuration
// This file serves as the single source of truth for all branding assets

import brandLogo from "@/assets/brand-logo-2025.png";

export const branding = {
  // Main logo used throughout the app UI
  logo: brandLogo,
  
  // Favicon (browser tab icon) - served from public directory
  favicon: "/favicon.png",
  
  // Open Graph image for social sharing previews
  ogImage: "/og-image.png",
  
  // App name
  appName: "Hammers Modality",
  
  // App tagline
  tagline: "Elite Baseball & Softball Training",
} as const;
