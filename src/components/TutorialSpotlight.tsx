import { useEffect, useState, useRef } from 'react';

interface TutorialSpotlightProps {
  target: string;
  onDismiss?: () => void;
}

export function TutorialSpotlight({ target, onDismiss }: TutorialSpotlightProps) {
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const updatePosition = () => {
      const element = document.querySelector(target);
      if (!element) {
        console.warn(`Tutorial spotlight target not found: ${target}`);
        setPosition(null);
        return;
      }

      const rect = element.getBoundingClientRect();
      const padding = 16;

      setPosition({
        top: rect.top - padding + window.scrollY,
        left: rect.left - padding + window.scrollX,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      });

      // Scroll element into view smoothly
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      });

      // Fade in after positioning
      timeoutRef.current = setTimeout(() => {
        setIsVisible(true);
      }, 100);
    };

    updatePosition();

    // Handle window resize and scroll with debouncing
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updatePosition, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    // Handle ESC key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onDismiss) {
        onDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
      window.removeEventListener('keydown', handleKeyDown);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [target, onDismiss]);

  if (!position) return null;

  return (
    <>
      {/* Overlay with blur */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ zIndex: 40, pointerEvents: 'none' }}
      />

      {/* Spotlight cutout with glow */}
      <div
        className={`fixed transition-all duration-500 ease-in-out ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          width: `${position.width}px`,
          height: `${position.height}px`,
          zIndex: 41,
          pointerEvents: 'none',
        }}
      >
        {/* Pulsing glow border */}
        <div className="absolute inset-0 rounded-lg border-2 border-primary shadow-[0_0_40px_rgba(var(--primary),0.6)] animate-pulse" />
        
        {/* Clear inner area */}
        <div className="absolute inset-[2px] rounded-lg bg-transparent" />
      </div>
    </>
  );
}
