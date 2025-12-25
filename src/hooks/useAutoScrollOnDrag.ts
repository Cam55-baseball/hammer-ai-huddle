import { useState, useRef, useEffect, useCallback } from 'react';

interface UseAutoScrollOnDragOptions {
  threshold?: number; // pixels from edge to trigger scrolling
  maxSpeed?: number; // maximum scroll speed in pixels
}

export function useAutoScrollOnDrag(options: UseAutoScrollOnDragOptions = {}) {
  const { threshold = 100, maxSpeed = 12 } = options;
  
  const [isDragging, setIsDragging] = useState(false);
  const scrollSpeedRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  // Animation loop for smooth scrolling
  useEffect(() => {
    if (!isDragging) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const scroll = () => {
      if (scrollSpeedRef.current !== 0) {
        window.scrollBy(0, scrollSpeedRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(scroll);
    };
    
    animationFrameRef.current = requestAnimationFrame(scroll);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isDragging]);

  // Calculate scroll speed based on pointer position
  const handleDrag = useCallback((event: PointerEvent | MouseEvent | TouchEvent | React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
    let clientY: number;
    
    if ('clientY' in event) {
      clientY = event.clientY;
    } else if ('touches' in event && event.touches.length > 0) {
      clientY = event.touches[0].clientY;
    } else {
      scrollSpeedRef.current = 0;
      return;
    }

    const viewportHeight = window.innerHeight;

    if (clientY < threshold) {
      // Near top - scroll up
      const intensity = (threshold - clientY) / threshold;
      scrollSpeedRef.current = -maxSpeed * intensity;
    } else if (clientY > viewportHeight - threshold) {
      // Near bottom - scroll down
      const intensity = (clientY - (viewportHeight - threshold)) / threshold;
      scrollSpeedRef.current = maxSpeed * intensity;
    } else {
      scrollSpeedRef.current = 0;
    }
  }, [threshold, maxSpeed]);

  const onDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const onDragEnd = useCallback(() => {
    setIsDragging(false);
    scrollSpeedRef.current = 0;
  }, []);

  return {
    isDragging,
    onDragStart,
    onDragEnd,
    handleDrag,
  };
}
