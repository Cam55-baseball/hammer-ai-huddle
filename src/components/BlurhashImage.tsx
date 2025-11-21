import { useState, useEffect } from 'react';
import { decode } from 'blurhash';

interface BlurhashImageProps {
  blurhash: string | null;
  src: string;
  alt: string;
  className?: string;
}

export function BlurhashImage({ blurhash, src, alt, className }: BlurhashImageProps) {
  const [placeholderSrc, setPlaceholderSrc] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (!blurhash) return;

    try {
      // Decode blurhash to canvas
      const pixels = decode(blurhash, 32, 32);
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        const imageData = ctx.createImageData(32, 32);
        imageData.data.set(pixels);
        ctx.putImageData(imageData, 0, 0);
        setPlaceholderSrc(canvas.toDataURL());
      }
    } catch (error) {
      console.error('Failed to decode blurhash:', error);
    }
  }, [blurhash]);

  return (
    <div className="relative w-full h-full">
      {/* Blurhash placeholder (blurred) */}
      {placeholderSrc && !imageLoaded && (
        <img
          src={placeholderSrc}
          alt=""
          className={`absolute inset-0 ${className}`}
          style={{ filter: 'blur(20px)' }}
        />
      )}
      {/* Actual image loads on top */}
      <img
        src={src}
        alt={alt}
        className={`relative ${className} ${!imageLoaded ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}`}
        loading="lazy"
        onLoad={() => setImageLoaded(true)}
      />
    </div>
  );
}
