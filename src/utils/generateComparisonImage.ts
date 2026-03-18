interface ComparisonPhoto {
  imageUrl: string | null;
  label: string;
  date: string;
  weight?: number | null;
}

interface MeasurementDelta {
  label: string;
  value: string;
}

export async function generateComparisonImage(
  photos: ComparisonPhoto[],
  deltas: MeasurementDelta[]
): Promise<void> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  const photoWidth = 400;
  const photoHeight = 533; // 3:4 aspect
  const padding = 40;
  const headerHeight = 80;
  const footerHeight = 60;
  const gapBetween = 20;
  
  const totalPhotos = photos.length;
  canvas.width = padding * 2 + totalPhotos * photoWidth + (totalPhotos - 1) * gapBetween;
  canvas.height = headerHeight + photoHeight + footerHeight + padding * 2;

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Title
  ctx.fillStyle = '#111111';
  ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('12-Week Transformation', canvas.width / 2, padding + 30);

  // Load and draw photos
  const loadImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    const x = padding + i * (photoWidth + gapBetween);
    const y = headerHeight + padding;

    if (photo.imageUrl) {
      try {
        const img = await loadImage(photo.imageUrl);
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x, y, photoWidth, photoHeight, 12);
        ctx.clip();
        // Cover fit
        const scale = Math.max(photoWidth / img.width, photoHeight / img.height);
        const sw = photoWidth / scale;
        const sh = photoHeight / scale;
        const sx = (img.width - sw) / 2;
        const sy = (img.height - sh) / 2;
        ctx.drawImage(img, sx, sy, sw, sh, x, y, photoWidth, photoHeight);
        ctx.restore();
      } catch {
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(x, y, photoWidth, photoHeight);
        ctx.fillStyle = '#999';
        ctx.font = '14px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('No image', x + photoWidth / 2, y + photoHeight / 2);
      }
    } else {
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(x, y, photoWidth, photoHeight);
    }

    // Label
    ctx.fillStyle = '#333';
    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(photo.label, x + photoWidth / 2, y + photoHeight + 20);

    // Date
    ctx.fillStyle = '#888';
    ctx.font = '12px system-ui';
    ctx.fillText(photo.date, x + photoWidth / 2, y + photoHeight + 38);
  }

  // Deltas at bottom
  if (deltas.length > 0) {
    const deltaY = headerHeight + padding + photoHeight + footerHeight - 5;
    ctx.fillStyle = '#555';
    ctx.font = '13px system-ui';
    ctx.textAlign = 'center';
    const deltaText = deltas.map(d => `${d.label}: ${d.value}`).join('  •  ');
    ctx.fillText(deltaText, canvas.width / 2, deltaY);
  }

  // Download
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '12-week-comparison.png';
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}
