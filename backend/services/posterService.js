import crypto from 'node:crypto';
import PosterAsset from '../models/PosterAsset.js';
import { redactPrivateText } from './aiSafetyService.js';

const COPY = {
  en: { lost: 'LOST ITEM', found: 'FOUND ITEM', where: 'Location', when: 'Date', action: 'Open the verified Smart L&F report', notice: 'Do not publish private ownership evidence.' },
  singlish: { lost: 'NATHI UNA ITEM', found: 'HAMBUNA ITEM', where: 'Thana', when: 'Dawasa', action: 'Verified Smart L&F report eka open karanna', notice: 'Private ownership evidence public karanna epa.' },
  si: { lost: 'නැති වූ භාණ්ඩයක්', found: 'හමු වූ භාණ්ඩයක්', where: 'ස්ථානය', when: 'දිනය', action: 'තහවුරු කළ Smart L&F වාර්තාව විවෘත කරන්න', notice: 'පුද්ගලික හිමිකම් සාක්ෂි ප්‍රසිද්ධ නොකරන්න.' },
  ta: { lost: 'தொலைந்த பொருள்', found: 'கிடைத்த பொருள்', where: 'இடம்', when: 'தேதி', action: 'சரிபார்க்கப்பட்ட Smart L&F அறிக்கையைத் திறக்கவும்', notice: 'தனிப்பட்ட உரிமைச் சான்றுகளை வெளியிட வேண்டாம்.' },
};
const escapeXml = (value) => String(value || '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[character]));
const clean = (value, max) => redactPrivateText(String(value || ''))
  .replace(/(?:\+?94|0)[\d -]{9,13}/gu, '[private detail removed]')
  .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu, '[private detail removed]')
  .replace(/\b(?:student\s*)?(?:id|reg(?:istration)?)\s*[:#-]?\s*[a-z0-9/-]{4,}\b/giu, '[private identifier removed]')
  .replace(/\*{4,}\d{4}/gu, '[private detail removed]')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, max);

const publicPosterFields = (item, reportType) => {
  const intelligence = item.locationIntelligence || {};
  const location = intelligence.sensitivity === 'public' && !intelligence.needsReview
    ? clean(intelligence.canonicalName || intelligence.area, 120)
    : clean(intelligence.area || 'University area', 120);
  const dateValue = item.lostDate || item.foundDate;
  const date = dateValue ? new Date(dateValue).toISOString().slice(0, 10) : '';
  const image = (item.images || []).find((entry) => entry.privacyStatus === 'safe_public' && /^https:\/\//u.test(entry.url));
  return {
    itemName: clean(item.itemName, 100), category: clean(item.category, 80),
    description: clean(item.description, 240), location, date,
    imageUrl: image?.url || '', reportType: reportType === 'FoundItem' ? 'found' : 'lost',
  };
};

const renderPosterSvg = ({ fields, language = 'en', deepLink, expiresAt }) => {
  const text = COPY[language] || COPY.en;
  const title = text[fields.reportType];
  const imageBlock = fields.imageUrl ? `<image href="${escapeXml(fields.imageUrl)}" x="70" y="235" width="660" height="380" preserveAspectRatio="xMidYMid slice" clip-path="url(#photo)"/>` : '<rect x="70" y="235" width="660" height="380" rx="28" fill="#1e293b"/><text x="400" y="435" text-anchor="middle" fill="#94a3b8" font-size="30">Smart L&amp;F</text>';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1120" viewBox="0 0 800 1120" role="img" aria-labelledby="title desc"><title id="title">${escapeXml(title)}: ${escapeXml(fields.itemName)}</title><desc id="desc">${escapeXml(fields.description)}</desc><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#09051d"/><stop offset="1" stop-color="#101d35"/></linearGradient><clipPath id="photo"><rect x="70" y="235" width="660" height="380" rx="28"/></clipPath></defs><rect width="800" height="1120" fill="url(#bg)"/><rect x="36" y="36" width="728" height="1048" rx="40" fill="none" stroke="#6366f1" stroke-width="3"/><text x="70" y="110" fill="#a5b4fc" font-size="28" font-family="Arial,sans-serif" font-weight="700">SMART L&amp;F · SEUSL</text><text x="70" y="178" fill="#ffffff" font-size="54" font-family="Arial,sans-serif" font-weight="900">${escapeXml(title)}</text>${imageBlock}<text x="70" y="690" fill="#ffffff" font-size="44" font-family="Arial,sans-serif" font-weight="800">${escapeXml(fields.itemName)}</text><text x="70" y="742" fill="#cbd5e1" font-size="24" font-family="Arial,sans-serif">${escapeXml(fields.category)}</text><text x="70" y="810" fill="#a5b4fc" font-size="22" font-family="Arial,sans-serif" font-weight="700">${escapeXml(text.where)}</text><text x="70" y="846" fill="#ffffff" font-size="26" font-family="Arial,sans-serif">${escapeXml(fields.location)}</text><text x="500" y="810" fill="#a5b4fc" font-size="22" font-family="Arial,sans-serif" font-weight="700">${escapeXml(text.when)}</text><text x="500" y="846" fill="#ffffff" font-size="26" font-family="Arial,sans-serif">${escapeXml(fields.date)}</text><rect x="70" y="900" width="660" height="82" rx="20" fill="#4f46e5"/><text x="400" y="934" text-anchor="middle" fill="#ffffff" font-size="20" font-family="Arial,sans-serif" font-weight="700">${escapeXml(text.action)}</text><text x="400" y="964" text-anchor="middle" fill="#e0e7ff" font-size="15" font-family="Arial,sans-serif">${escapeXml(deepLink)}</text><text x="70" y="1035" fill="#94a3b8" font-size="16" font-family="Arial,sans-serif">${escapeXml(text.notice)} · Expires ${escapeXml(new Date(expiresAt).toISOString().slice(0, 10))}</text></svg>`;
};

const createPosterPreview = async ({ item, reportType, ownerId, language = 'en', now = new Date() }) => {
  const fields = publicPosterFields(item, reportType);
  const base = String(process.env.CLIENT_URL || '').replace(/\/$/u, '');
  const path = reportType === 'FoundItem' ? `/found-items/${item._id}` : `/lost-items/${item._id}`;
  const deepLink = `${base}${path}` || path;
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const svg = renderPosterSvg({ fields, language, deepLink, expiresAt });
  const svgChecksum = crypto.createHash('sha256').update(svg).digest('hex');
  const asset = await PosterAsset.create({ ownerId, reportType, reportId: item._id, language, safeFields: ['itemName', 'category', 'description', 'approximateLocation', 'date', 'deepLink'], safeImageUrl: fields.imageUrl, deepLink, svgChecksum, expiresAt });
  return { assetId: asset._id, status: asset.status, expiresAt, deepLink, svg, downloadDataUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`, privacyNotice: 'Poster excludes contact details, exact private evidence, IDs and unreviewed images.' };
};

export { COPY, createPosterPreview, publicPosterFields, renderPosterSvg };
