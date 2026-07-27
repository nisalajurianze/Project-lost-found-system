export const initCronJobs = () => {
  throw new Error('Legacy auto-clean cron is disabled. Use jobs/cleanupJob.js and jobs/reminderJob.js, which include distributed locks.');
};
