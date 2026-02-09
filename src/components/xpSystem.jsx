import { base44 } from '@/api/base44Client';
import { triggerXPGain } from '@/components/olimpo/XPGainEffect';

/**
 * Central XP awarding function - SINGLE SOURCE OF TRUTH
 * All XP grants MUST go through this function to ensure:
 * 1. Persistence in XPTransaction
 * 2. Visual feedback (animation)
 * 3. Audio feedback (if enabled)
 */
export async function awardXp({
  amount,
  sourceType,
  sourceId,
  note = '',
  sfxEnabled = true
}) {
  try {
    // 1. Persist XP transaction
    await base44.entities.XPTransaction.create({
      sourceType,
      sourceId,
      amount,
      note
    });

    // 2. Trigger visual + audio feedback
    triggerXPGain(amount, sfxEnabled);

    return { success: true, amount };
  } catch (error) {
    console.error('Error awarding XP:', error);
    throw error;
  }
}