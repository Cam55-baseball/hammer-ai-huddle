import jsPDF from 'jspdf';

interface VaultRecap {
  id: string;
  recap_period_start: string;
  recap_period_end: string;
  total_weight_lifted: number | null;
  strength_change_percent: number | null;
  recap_data: {
    summary?: string;
    highlights?: string[];
    improvements?: string[];
    focus_areas?: string[];
    recommendations?: string[];
    workout_stats?: {
      total_workouts: number;
      total_weight: number;
      weight_increases: number;
      avg_session_weight: number;
    };
    mental_stats?: {
      avg_mental: number;
      avg_emotional: number;
      avg_physical: number;
      quiz_count: number;
    };
    nutrition_stats?: {
      avg_calories: number;
      avg_protein: number;
      avg_energy: number;
      logs_count: number;
    };
    performance_tests?: number;
  };
  generated_at: string;
  saved_to_library?: boolean;
}

export async function generateRecapPdf(recap: VaultRecap): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yOffset = 20;

  // Helper to add text with word wrap
  const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 11): number => {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y);
    return y + lines.length * (fontSize * 0.4) + 4;
  };

  // Helper to check if we need a new page
  const checkPageBreak = (requiredSpace: number): void => {
    if (yOffset + requiredSpace > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      yOffset = 20;
    }
  };

  // Title
  doc.setFontSize(24);
  doc.setTextColor(139, 92, 246); // Violet
  doc.text('6-Week Training Recap', pageWidth / 2, yOffset, { align: 'center' });
  yOffset += 12;

  // Date range
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  const dateRange = `${new Date(recap.recap_period_start).toLocaleDateString()} - ${new Date(recap.recap_period_end).toLocaleDateString()}`;
  doc.text(dateRange, pageWidth / 2, yOffset, { align: 'center' });
  yOffset += 15;

  // Horizontal line
  doc.setDrawColor(139, 92, 246);
  doc.setLineWidth(0.5);
  doc.line(margin, yOffset, pageWidth - margin, yOffset);
  yOffset += 10;

  // Stats section
  if (recap.recap_data.workout_stats) {
    doc.setFontSize(14);
    doc.setTextColor(50, 50, 50);
    doc.setFont('helvetica', 'bold');
    doc.text('Training Stats', margin, yOffset);
    yOffset += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(70, 70, 70);
    
    const stats = [
      `Total Workouts: ${recap.recap_data.workout_stats.total_workouts}`,
      `Total Weight Lifted: ${recap.total_weight_lifted?.toLocaleString() || 0} lbs`,
      `Weight Increases: ${recap.recap_data.workout_stats.weight_increases}`,
      `Avg Session Weight: ${recap.recap_data.workout_stats.avg_session_weight?.toLocaleString() || 0} lbs`,
    ];

    if (recap.strength_change_percent !== null && recap.strength_change_percent !== 0) {
      stats.push(`Strength Change: ${recap.strength_change_percent > 0 ? '+' : ''}${recap.strength_change_percent}%`);
    }

    stats.forEach(stat => {
      doc.text(`• ${stat}`, margin + 5, yOffset);
      yOffset += 6;
    });
    yOffset += 5;
  }

  // Mental Stats
  if (recap.recap_data.mental_stats) {
    checkPageBreak(40);
    doc.setFontSize(14);
    doc.setTextColor(50, 50, 50);
    doc.setFont('helvetica', 'bold');
    doc.text('Mental Readiness', margin, yOffset);
    yOffset += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(70, 70, 70);
    
    const mentalStats = [
      `Avg Mental: ${recap.recap_data.mental_stats.avg_mental.toFixed(1)}/5`,
      `Avg Emotional: ${recap.recap_data.mental_stats.avg_emotional.toFixed(1)}/5`,
      `Avg Physical: ${recap.recap_data.mental_stats.avg_physical.toFixed(1)}/5`,
      `Total Check-ins: ${recap.recap_data.mental_stats.quiz_count}`,
    ];

    mentalStats.forEach(stat => {
      doc.text(`• ${stat}`, margin + 5, yOffset);
      yOffset += 6;
    });
    yOffset += 5;
  }

  // Summary
  if (recap.recap_data.summary) {
    checkPageBreak(50);
    doc.setFontSize(14);
    doc.setTextColor(139, 92, 246);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', margin, yOffset);
    yOffset += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    yOffset = addWrappedText(recap.recap_data.summary, margin, yOffset, contentWidth, 11);
    yOffset += 5;
  }

  // Highlights
  if (recap.recap_data.highlights && recap.recap_data.highlights.length > 0) {
    checkPageBreak(40);
    doc.setFontSize(14);
    doc.setTextColor(245, 158, 11); // Amber
    doc.setFont('helvetica', 'bold');
    doc.text('Highlights', margin, yOffset);
    yOffset += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    
    recap.recap_data.highlights.forEach(highlight => {
      checkPageBreak(15);
      yOffset = addWrappedText(`✓ ${highlight}`, margin + 5, yOffset, contentWidth - 10, 11);
    });
    yOffset += 5;
  }

  // Improvements
  if (recap.recap_data.improvements && recap.recap_data.improvements.length > 0) {
    checkPageBreak(40);
    doc.setFontSize(14);
    doc.setTextColor(34, 197, 94); // Green
    doc.setFont('helvetica', 'bold');
    doc.text('Areas of Improvement', margin, yOffset);
    yOffset += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    
    recap.recap_data.improvements.forEach(improvement => {
      checkPageBreak(15);
      yOffset = addWrappedText(`⚡ ${improvement}`, margin + 5, yOffset, contentWidth - 10, 11);
    });
    yOffset += 5;
  }

  // Recommendations
  if (recap.recap_data.recommendations && recap.recap_data.recommendations.length > 0) {
    checkPageBreak(40);
    doc.setFontSize(14);
    doc.setTextColor(139, 92, 246); // Violet
    doc.setFont('helvetica', 'bold');
    doc.text('Recommendations for Next 6 Weeks', margin, yOffset);
    yOffset += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    
    recap.recap_data.recommendations.forEach((rec, index) => {
      checkPageBreak(15);
      yOffset = addWrappedText(`${index + 1}. ${rec}`, margin + 5, yOffset, contentWidth - 10, 11);
    });
    yOffset += 5;
  }

  // Footer
  checkPageBreak(20);
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Generated on ${new Date(recap.generated_at).toLocaleDateString()} | Hammers Modality`,
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 10,
    { align: 'center' }
  );

  // Save the PDF
  doc.save(`training-recap-${recap.recap_period_end}.pdf`);
}

export async function generateRecapPdfBase64(recap: VaultRecap): Promise<string> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yOffset = 20;

  // Helper to add text with word wrap
  const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 11): number => {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y);
    return y + lines.length * (fontSize * 0.4) + 4;
  };

  // Helper to check if we need a new page
  const checkPageBreak = (requiredSpace: number): void => {
    if (yOffset + requiredSpace > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      yOffset = 20;
    }
  };

  // Title
  doc.setFontSize(24);
  doc.setTextColor(139, 92, 246);
  doc.text('6-Week Training Recap', pageWidth / 2, yOffset, { align: 'center' });
  yOffset += 12;

  // Date range
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  const dateRange = `${new Date(recap.recap_period_start).toLocaleDateString()} - ${new Date(recap.recap_period_end).toLocaleDateString()}`;
  doc.text(dateRange, pageWidth / 2, yOffset, { align: 'center' });
  yOffset += 15;

  // Horizontal line
  doc.setDrawColor(139, 92, 246);
  doc.setLineWidth(0.5);
  doc.line(margin, yOffset, pageWidth - margin, yOffset);
  yOffset += 10;

  // Stats section
  if (recap.recap_data.workout_stats) {
    doc.setFontSize(14);
    doc.setTextColor(50, 50, 50);
    doc.setFont('helvetica', 'bold');
    doc.text('Training Stats', margin, yOffset);
    yOffset += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(70, 70, 70);
    
    const stats = [
      `Total Workouts: ${recap.recap_data.workout_stats.total_workouts}`,
      `Total Weight Lifted: ${recap.total_weight_lifted?.toLocaleString() || 0} lbs`,
    ];

    stats.forEach(stat => {
      doc.text(`• ${stat}`, margin + 5, yOffset);
      yOffset += 6;
    });
    yOffset += 5;
  }

  // Summary
  if (recap.recap_data.summary) {
    checkPageBreak(50);
    doc.setFontSize(14);
    doc.setTextColor(139, 92, 246);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', margin, yOffset);
    yOffset += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    yOffset = addWrappedText(recap.recap_data.summary, margin, yOffset, contentWidth, 11);
    yOffset += 5;
  }

  // Highlights
  if (recap.recap_data.highlights && recap.recap_data.highlights.length > 0) {
    checkPageBreak(40);
    doc.setFontSize(14);
    doc.setTextColor(245, 158, 11);
    doc.setFont('helvetica', 'bold');
    doc.text('Highlights', margin, yOffset);
    yOffset += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    
    recap.recap_data.highlights.forEach(highlight => {
      checkPageBreak(15);
      yOffset = addWrappedText(`✓ ${highlight}`, margin + 5, yOffset, contentWidth - 10, 11);
    });
  }

  // Footer
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Generated on ${new Date(recap.generated_at).toLocaleDateString()} | Hammers Modality`,
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 10,
    { align: 'center' }
  );

  // Return as base64
  return doc.output('datauristring').split(',')[1];
}
