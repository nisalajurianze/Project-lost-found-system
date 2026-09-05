// Vercel deployments provide /api rewrites. Keep cookie sessions first-party
// even when an older project environment still contains the Railway URL.
export const resolveApiBaseUrl = ({ configuredUrl, hostname, isProduction }) => {
  if (isProduction && String(hostname).toLowerCase().endsWith('.vercel.app')) return '/api';
  return configuredUrl || '/api';
};
