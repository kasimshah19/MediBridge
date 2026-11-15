import cron from 'node-cron';
import env from '../config/env.js';
import JobRun from '../models/JobRun.js';
import { runExpiryCheck } from '../services/expiry.service.js';

let cronTask = null;

/**
 * Initializes the automated daily internal cron job for expiry checking.
 * Only runs if ENABLE_INTERNAL_CRON is true.
 */
export const initExpiryJob = () => {
  if (!env.ENABLE_INTERNAL_CRON) {
    console.log('ℹ️ Internal expiry cron job is disabled via ENABLE_INTERNAL_CRON');
    return;
  }

  const schedule = env.EXPIRY_CRON_SCHEDULE || '10 0 * * *';
  console.log(`⏰ Initializing internal expiry cron [${schedule}] (Asia/Kolkata)...`);

  cronTask = cron.schedule(
    schedule,
    async () => {
      console.log('🔄 [CRON] Starting daily automated medicine expiry check...');
      try {
        const result = await runExpiryCheck({
          trigger: 'cron',
          dryRun: false,
        });

        if (result.skipped) {
          console.log(`⚠️ [CRON] Expiry check skipped: ${result.reason}`);
        } else {
          console.log(
            `✅ [CRON] Expiry check finished in ${result.durationMs}ms: ` +
              `scanned=${result.stats.scanned}, ` +
              `priorityChanged=${result.stats.priorityChanged}, ` +
              `newlyExpired=${result.stats.newlyExpired}, ` +
              `notifications=${result.stats.notificationsCreated}`
          );
        }
      } catch (err) {
        console.error('❌ [CRON] Error during scheduled expiry check:', err.message);
      }
    },
    {
      timezone: 'Asia/Kolkata',
    }
  );
};

/**
 * Startup catch-up check:
 * Runs non-blocking after server start if no successful non-dry job run
 * exists within the last 24 hours (e.g. if free-tier cloud host was sleeping).
 */
export const runStartupCatchupIfRequired = async () => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const lastSuccess = await JobRun.findOne({
      name: 'expiry-check',
      status: 'success',
      dryRun: false,
      finishedAt: { $gte: twentyFourHoursAgo },
    });

    if (!lastSuccess) {
      console.log('⚡ [CATCHUP] No successful expiry run in past 24h. Running startup catchup...');
      runExpiryCheck({
        trigger: 'startup_catchup',
        dryRun: false,
      })
        .then((res) => {
          if (res.skipped) {
            console.log(`ℹ️ [CATCHUP] Startup catchup skipped: ${res.reason}`);
          } else {
            console.log(
              `✅ [CATCHUP] Finished in ${res.durationMs}ms: newlyExpired=${res.stats.newlyExpired}, priorityChanged=${res.stats.priorityChanged}`
            );
          }
        })
        .catch((err) => {
          console.error('❌ [CATCHUP] Startup catchup error:', err.message);
        });
    } else {
      console.log('✅ [CATCHUP] Recent expiry job found in last 24h; catchup not needed.');
    }
  } catch (err) {
    console.error('⚠️ [CATCHUP] Could not inspect recent job runs for startup catchup:', err.message);
  }
};

export default {
  initExpiryJob,
  runStartupCatchupIfRequired,
};
