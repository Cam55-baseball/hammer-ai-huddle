import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { Skeleton } from '@/components/ui/skeleton';

interface VideoCardLazyProps {
  children: React.ReactNode;
}

export function VideoCardLazy({ children }: VideoCardLazyProps) {
  const { targetRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '200px',
    triggerOnce: true
  });

  return (
    <div ref={targetRef}>
      {isIntersecting ? (
        children
      ) : (
        <Skeleton className="h-[400px] rounded-lg" />
      )}
    </div>
  );
}
