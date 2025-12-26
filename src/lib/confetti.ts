/**
 * Reusable confetti celebration utility
 * Creates a confetti animation overlay that respects reduced motion preferences
 */

export function triggerConfetti() {
  // Respect reduced motion preferences
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  // Create confetti container
  const container = document.createElement('div');
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

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = Math.random() * 10 + 5;
    const left = Math.random() * 100;
    const animationDuration = Math.random() * 2 + 2;
    const delay = Math.random() * 0.5;
    const rotation = Math.random() * 720;

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

  // Clean up after animation
  setTimeout(() => {
    container.remove();
  }, 5000);
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
