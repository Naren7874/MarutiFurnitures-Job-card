import { UserPermission } from '../models/UserPermission.js';
import { resolvePermissions } from '../utils/resolvePermissions.js';

/**
 * expiredOverridesCron
 *
 * SRS §10 — runs daily at 00:00.
 * Finds all UserPermission documents with at least one expired override.
 * Removes the expired overrides and rebuilds effectivePermissions for each affected user.
 */
export const runExpiredOverridesCron = async () => {
  console.log('[CRON] Running expired overrides cleanup...');
  const now = new Date();

  try {
    // Find UserPermission docs that have at least one expired override
    const affected = await UserPermission.find({
      'overrides.expiresAt': { $lt: now },
    }).lean();

    if (affected.length === 0) {
      console.log('[CRON] Expired overrides: none found');
      return;
    }

    let cleanedCount = 0;
    for (const up of affected) {
      // $pull expired overrides (only those with an actual expiresAt, permanent ones have null)
      await UserPermission.updateOne(
        { _id: up._id },
        {
          $pull: {
            overrides: {
              expiresAt: { $lt: now, $ne: null },
            },
          },
        }
      );

      // Rebuild effectivePermissions cache for this user
      await resolvePermissions(up.userId);
      cleanedCount++;
    }

    console.log(`[CRON] Expired overrides: cleaned ${cleanedCount} user permission doc(s)`);
  } catch (err) {
    console.error('[CRON] expiredOverridesCron error:', err.message);
  }
};
