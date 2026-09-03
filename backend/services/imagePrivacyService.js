const maskSensitiveText = (value) => {
  const input = String(value || '').trim();
  if (!input) return '';
  const masked = input
    .replace(/\b(?:\d[ -]*?){12,19}\b/gu, (match) => `**** **** **** ${match.replace(/\D/g, '').slice(-4)}`)
    .replace(/\b(?:\+?94|0)[\d -]{8,12}\b/gu, (match) => `******${match.replace(/\D/g, '').slice(-4)}`)
    .replace(/\b(?:student\s*)?(?:id|reg(?:istration)?)[\s:#-]*[a-z0-9/-]{4,}\b/giu, '[masked identifier]')
    .replace(/\b([A-Z0-9._%+-]{1,2})[A-Z0-9._%+-]*@([A-Z0-9.-]+\.[A-Z]{2,})\b/giu, '$1***@$2');
  if (masked !== input) return masked;
  return input.length > 120 ? `${input.slice(0, 108)}…${input.slice(-8)}` : input;
};

const sanitizeRegion = (region) => {
  const clamp = (number) => Math.max(0, Math.min(1, Number(number) || 0));
  const x = clamp(region?.x);
  const y = clamp(region?.y);
  const width = Math.min(1 - x, clamp(region?.width));
  const height = Math.min(1 - y, clamp(region?.height));
  if (width <= 0 || height <= 0) return null;
  return { x, y, width, height, reason: String(region?.reason || 'sensitive-text').slice(0, 80) };
};

export { maskSensitiveText, sanitizeRegion };
