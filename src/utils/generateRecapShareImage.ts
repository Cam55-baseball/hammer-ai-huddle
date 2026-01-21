import html2canvas from 'html2canvas';

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
  };
  generated_at: string;
}

export async function generateRecapShareImage(recap: VaultRecap): Promise<Blob> {
  // Create a hidden container with branded design
  const container = document.createElement('div');
  container.style.cssText = `
    width: 1200px;
    height: 630px;
    padding: 48px;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%);
    color: white;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    position: fixed;
    left: -9999px;
    top: 0;
    display: flex;
    flex-direction: column;
  `;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const workouts = recap.recap_data.workout_stats?.total_workouts || 0;
  const totalWeight = recap.total_weight_lifted?.toLocaleString() || '0';
  const strengthChange = recap.strength_change_percent;
  const avgMental = recap.recap_data.mental_stats?.avg_mental?.toFixed(1) || 'N/A';
  const highlight = recap.recap_data.highlights?.[0] || 'Great progress this cycle!';

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; height: 100%; justify-content: space-between;">
      <!-- Header -->
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <div style="width: 56px; height: 56px; background: linear-gradient(135deg, #8b5cf6, #a78bfa); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 28px;">🏋️</span>
          </div>
          <div>
            <div style="font-size: 24px; font-weight: bold; color: #ffffff;">Hammers Modality</div>
            <div style="font-size: 14px; color: #a78bfa;">Elite Training System</div>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 14px; color: #9ca3af;">6-Week Training Recap</div>
          <div style="font-size: 18px; color: #e5e7eb; font-weight: 600;">
            ${formatDate(recap.recap_period_start)} - ${formatDate(recap.recap_period_end)}
          </div>
        </div>
      </div>

      <!-- Stats Grid -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 32px 0;">
        <!-- Workouts -->
        <div style="background: rgba(139, 92, 246, 0.15); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 16px; padding: 24px; text-align: center;">
          <div style="font-size: 48px; font-weight: bold; color: #8b5cf6; line-height: 1;">${workouts}</div>
          <div style="font-size: 14px; color: #9ca3af; margin-top: 8px;">Workouts</div>
        </div>
        
        <!-- Total Weight -->
        <div style="background: rgba(249, 115, 22, 0.15); border: 1px solid rgba(249, 115, 22, 0.3); border-radius: 16px; padding: 24px; text-align: center;">
          <div style="font-size: 36px; font-weight: bold; color: #f97316; line-height: 1;">${totalWeight}</div>
          <div style="font-size: 14px; color: #9ca3af; margin-top: 8px;">Lbs Lifted</div>
        </div>
        
        <!-- Strength Change -->
        <div style="background: ${strengthChange && strengthChange > 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(100, 100, 100, 0.15)'}; border: 1px solid ${strengthChange && strengthChange > 0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(100, 100, 100, 0.3)'}; border-radius: 16px; padding: 24px; text-align: center;">
          <div style="font-size: 48px; font-weight: bold; color: ${strengthChange && strengthChange > 0 ? '#22c55e' : '#9ca3af'}; line-height: 1;">
            ${strengthChange ? (strengthChange > 0 ? '+' : '') + strengthChange + '%' : 'N/A'}
          </div>
          <div style="font-size: 14px; color: #9ca3af; margin-top: 8px;">Strength</div>
        </div>
        
        <!-- Mental -->
        <div style="background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 16px; padding: 24px; text-align: center;">
          <div style="font-size: 48px; font-weight: bold; color: #3b82f6; line-height: 1;">${avgMental}</div>
          <div style="font-size: 14px; color: #9ca3af; margin-top: 8px;">Avg Mental</div>
        </div>
      </div>

      <!-- Highlight -->
      <div style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.1)); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 16px; padding: 24px; flex: 1; display: flex; flex-direction: column; justify-content: center;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
          <span style="font-size: 20px;">⭐</span>
          <span style="font-size: 14px; color: #a78bfa; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Top Highlight</span>
        </div>
        <div style="font-size: 24px; color: #ffffff; line-height: 1.4; font-weight: 500;">
          ${highlight.length > 150 ? highlight.substring(0, 147) + '...' : highlight}
        </div>
      </div>

      <!-- Footer -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 24px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 14px; color: #6b7280;">Generated with AI-powered analytics</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 14px; color: #8b5cf6; font-weight: 600;">#HammersModality</span>
          <span style="font-size: 14px; color: #6b7280;">•</span>
          <span style="font-size: 14px; color: #8b5cf6; font-weight: 600;">#TrainingRecap</span>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#1a1a2e',
    });

    document.body.removeChild(container);

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create image blob'));
        }
      }, 'image/png', 1.0);
    });
  } catch (error) {
    document.body.removeChild(container);
    throw error;
  }
}
