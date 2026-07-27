const maskSensitiveText = (value) => {
  const input = String(value || '').trim();
  if (!input) return '';
  if (/\b(?:\d[ -]*?){12,19}\b/.test(input)) return '**** **** **** ' + input.replace(/\D/g, '').slice(-4);
  if (/\b(?:\+?94|0)?\d{9}\b/.test(input.replace(/[ -]/g, ''))) return `******${input.replace(/\D/g, '').slice(-4)}`;
  if (/\b(?:student|id|reg|registration)[\s:#-]*[a-z0-9/-]{4,}\b/i.test(input)) return `${input.slice(0, Math.min(3, input.length))}****${input.slice(-2)}`;
  if (/@/.test(input)) {
    const [name, domain] = input.split('@');
    return `${name?.slice(0, 2) || ''}***@${domain || 'hidden'}`;
  }
  return input.length > 32 ? `${input.slice(0, 8)}…${input.slice(-4)}` : input;
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
