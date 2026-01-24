/**
 * Reusable confetti celebration utility
 * Creates a confetti animation overlay that respects reduced motion preferences
 */

// Global lock to prevent multiple simultaneous confetti bursts
let isConfettiActive = false;

export function triggerConfetti() {
  // Prevent multiple simultaneous confetti bursts
  if (isConfettiActive) return;

  // Respect reduced motion preferences
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  isConfettiActive = true;

  // Create confetti container with data attribute for cleanup
  const container = document.createElement('div');
  container.setAttribute('data-confetti-container', 'true');
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 9999;
    overflow: hidden;
  `;
  document.body.appendChild(container);

  // Sport-inspired colors
  const colors = ['#8b5cf6', '#d946ef', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#22c55e', '#ef4444'];
  const particleCount = 60;

  // Track max animation time for proper cleanup
  let maxAnimationEnd = 0;

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = Math.random() * 10 + 5;
    const left = Math.random() * 100;
    const animationDuration = Math.random() * 2 + 2; // 2-4 seconds
    const delay = Math.random() * 0.5; // 0-0.5 seconds
    const rotation = Math.random() * 720;

    // Track when this particle's animation will end
    const particleEnd = (animationDuration + delay) * 1000;
    if (particleEnd > maxAnimationEnd) {
      maxAnimationEnd = particleEnd;
    }

    particle.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      background-color: ${color};
      left: ${left}%;
      top: -20px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
      animation: confetti-fall ${animationDuration}s ease-out ${delay}s forwards;
      transform: rotate(${rotation}deg);
    `;

    container.appendChild(particle);
  }

  // Add animation keyframes if not already present
  if (!document.getElementById('confetti-styles')) {
    const style = document.createElement('style');
    style.id = 'confetti-styles';
    style.textContent = `
      @keyframes confetti-fall {
        0% {
          transform: translateY(0) rotate(0deg);
          opacity: 1;
        }
        100% {
          transform: translateY(100vh) rotate(720deg);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Clean up after longest animation completes (add 500ms buffer)
  const cleanupTime = Math.max(maxAnimationEnd + 500, 5000);
  setTimeout(() => {
    container.remove();
    isConfettiActive = false;
  }, cleanupTime);
}

/**
 * Force stop any active confetti
 */
export function stopConfetti() {
  const container = document.querySelector('[data-confetti-container]');
  if (container) {
    container.remove();
  }
  isConfettiActive = false;
}

/**
 * Trigger haptic feedback if available
 */
export function triggerHapticFeedback(pattern: number[] = [100, 50, 100]) {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

/**
 * Combined celebration effect (confetti + haptic)
 */
export function triggerCelebration() {
  triggerConfetti();
  triggerHapticFeedback();
}
