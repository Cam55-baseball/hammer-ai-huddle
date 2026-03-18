import jsPDF from 'jspdf';

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

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateComparisonPdf(
  photos: ComparisonPhoto[],
  deltas: MeasurementDelta[]
): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Title
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('12-Week Transformation', pageWidth / 2, 20, { align: 'center' });

  // Photos
  const photoCount = photos.length;
  const margin = 20;
  const gap = 10;
  const availableWidth = pageWidth - margin * 2 - (photoCount - 1) * gap;
  const photoWidth = availableWidth / photoCount;
  const photoHeight = photoWidth * (4 / 3);
  const startY = 30;

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    const x = margin + i * (photoWidth + gap);

    if (photo.imageUrl) {
      const base64 = await fetchImageAsBase64(photo.imageUrl);
      if (base64) {
        try {
          doc.addImage(base64, 'JPEG', x, startY, photoWidth, photoHeight);
        } catch {
          doc.setFillColor(240, 240, 240);
          doc.rect(x, startY, photoWidth, photoHeight, 'F');
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text('No image', x + photoWidth / 2, startY + photoHeight / 2, { align: 'center' });
        }
      }
    } else {
      doc.setFillColor(240, 240, 240);
      doc.rect(x, startY, photoWidth, photoHeight, 'F');
    }

    // Label below photo
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(photo.label, x + photoWidth / 2, startY + photoHeight + 6, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(photo.date, x + photoWidth / 2, startY + photoHeight + 12, { align: 'center' });

    if (photo.weight) {
      doc.text(`${photo.weight} lbs`, x + photoWidth / 2, startY + photoHeight + 17, { align: 'center' });
    }
  }

  // Deltas
  if (deltas.length > 0) {
    const deltaY = startY + photoHeight + 25;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const deltaText = deltas.map(d => `${d.label}: ${d.value}`).join('   •   ');
    doc.text(deltaText, pageWidth / 2, deltaY, { align: 'center' });
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`Generated ${new Date().toLocaleDateString()}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

  doc.save('12-week-comparison.pdf');
}
