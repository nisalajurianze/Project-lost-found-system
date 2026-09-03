import crypto from 'node:crypto';
import AIKnowledgeArticle from '../models/AIKnowledgeArticle.js';
import { semanticSimilarity } from './semanticSearchService.js';

const SYSTEM_ARTICLES = Object.freeze([
  {
    _id: 'system-seusl-faculties', type: 'campus', slug: 'seusl-faculties-campuses',
    title: 'SEUSL faculties and campuses',
    answer: 'SEUSL has six faculties. Arts and Culture, Management and Commerce, Islamic Studies and Arabic Language, Engineering, and Technology are at the main Oluvil campus. Applied Sciences is at Sammanthurai.',
    translations: {
      singlish: { answer: 'SEUSL eke faculties 6k tiyenawa. Arts and Culture, Management and Commerce, Islamic Studies and Arabic Language, Engineering saha Technology Oluvil main campus eke. Applied Sciences tiyenne Sammanthurai.' },
      si: { answer: 'SEUSL හි පීඨ 6ක් ඇත. කලා හා සංස්කෘතික, කළමනාකරණ හා වාණිජ, ඉස්ලාමීය අධ්‍යයන හා අරාබි භාෂා, ඉංජිනේරු සහ තාක්ෂණ පීඨ ඔලුවිල් ප්‍රධාන පරිශ්‍රයේ ඇත. ව්‍යවහාරික විද්‍යා පීඨය සමන්තුරේ ඇත.' },
      ta: { answer: 'SEUSL-இல் 6 பீடங்கள் உள்ளன. கலை மற்றும் கலாசாரம், முகாமைத்துவம் மற்றும் வர்த்தகம், இஸ்லாமிய கற்கைகள் மற்றும் அரபு மொழி, பொறியியல், தொழில்நுட்ப பீடங்கள் ஒலுவில் பிரதான வளாகத்தில் உள்ளன. பிரயோக விஞ்ஞான பீடம் சம்மாந்துறையில் உள்ளது.' },
    },
    aliases: ['fac fac campus fmc fia engineering technology fas sammanthurai oluvil which faculty where faculty'],
    sourceUrl: 'https://www.seu.ac.lk/overview.php', sourceLabel: 'Official SEUSL overview', visibility: 'public', status: 'approved', version: 1,
  },
  {
    _id: 'system-seusl-library', type: 'campus', slug: 'seusl-library-locations',
    title: 'SEUSL library locations',
    answer: 'SEUSL operates a Main Library at Oluvil and a Science Library serving the Faculty of Applied Sciences at Sammanthurai. Check the official library page for current opening times before travelling.',
    translations: {
      singlish: { answer: 'SEUSL Main Library eka Oluvil. Faculty of Applied Sciences walata Science Library eka Sammanthurai. Yanna kalin current opening times official library page eken balanna.' },
      si: { answer: 'SEUSL ප්‍රධාන පුස්තකාලය ඔලුවිල්හි ඇත. ව්‍යවහාරික විද්‍යා පීඨයට සේවය කරන Science Library එක සමන්තුරේ ඇත. යාමට පෙර වත්මන් විවෘත වේලාවන් නිල library පිටුවෙන් බලන්න.' },
      ta: { answer: 'SEUSL பிரதான நூலகம் ஒலுவிலில் உள்ளது. பிரயோக விஞ்ஞான பீடத்திற்கான Science Library சம்மாந்துறையில் உள்ளது. செல்லும் முன் தற்போதைய திறப்பு நேரத்தை அதிகாரப்பூர்வ நூலகப் பக்கத்தில் பார்க்கவும்.' },
    },
    aliases: ['library libry science library main library opening hours where library'],
    sourceUrl: 'https://seu.ac.lk/library/facilities.php', sourceLabel: 'Official SEUSL Main Library', visibility: 'public', status: 'approved', version: 1,
  },
  {
    _id: 'system-lf-reporting', type: 'faq', slug: 'smart-lf-reporting-rules',
    title: 'How Smart L&F reporting works',
    answer: 'Create a lost or found report with an item description, approximate campus location, date and one non-secret identifying feature. Review every field before submission. A match is only a lead and never proof of ownership.',
    translations: {
      singlish: { answer: 'Lost hari found report ekata item description, lagadi campus location, date saha secret nowana unique feature ekak denna. Submit karanna kalin fields okkoma balanna. Match ekak lead ekak witharai; ownership proof ekak newei.' },
      si: { answer: 'නැතිවූ හෝ හමුවූ වාර්තාවට භාණ්ඩ විස්තරයක්, ආසන්න campus ස්ථානය, දිනය සහ රහසිගත නොවන සුවිශේෂී ලක්ෂණයක් දෙන්න. යැවීමට පෙර සියලු fields බලන්න. Match එකක් ඉඟියක් පමණක් වන අතර හිමිකමට සාක්ෂියක් නොවේ.' },
      ta: { answer: 'தொலைந்த அல்லது கிடைத்த அறிக்கையில் பொருள் விவரம், அண்மையான campus இடம், தேதி மற்றும் இரகசியமல்லாத தனித்துவ அம்சத்தை வழங்கவும். சமர்ப்பிக்கும் முன் எல்லா புலங்களையும் பார்க்கவும். Match ஒரு குறிப்பு மட்டுமே; உரிமைக்கான சான்றல்ல.' },
    },
    aliases: ['faq lost found report rule how report claim ownership privacy'],
    sourceUrl: '/about', sourceLabel: 'Smart L&F transparency and safety policy', visibility: 'public', status: 'approved', version: 1,
  },
]);

const KNOWLEDGE_PATTERN = /\b(?:faq|policy|rules?|which facult|where is (?:fas|faculty|library)|library (?:hours|open|location)|campus (?:map|facilities|faculty)|how (?:do|can|to) (?:report|claim))\b|නීති|ප්‍රතිපත්තිය|පීඨ|පුස්තකාලය කොහෙද|விதி|கொள்கை|பீடம்|நூலகம் எங்கே/iu;
const isKnowledgeQuery = (message) => KNOWLEDGE_PATTERN.test(String(message || '').normalize('NFKC'));
const articleDocument = (article) => [article.title, article.answer, ...(article.aliases || [])].join(' ');
const rankKnowledgeArticles = (query, articles, responseStyle = 'en') => (articles || [])
  .map((article) => ({ article, score: semanticSimilarity(query, { itemName: article.title, description: articleDocument(article) }) }))
  .filter(({ score }) => score >= 0.2)
  .sort((left, right) => right.score - left.score)
  .map(({ article, score }) => ({
    id: article._id,
    title: article.translations?.[responseStyle]?.title || article.title,
    answer: article.translations?.[responseStyle]?.answer || article.answer,
    confidence: Math.round(score * 100),
    version: article.version,
    citation: { label: article.sourceLabel, url: article.sourceUrl },
  }));

const answerKnowledgeQuery = async ({ query, responseStyle = 'en', authenticated = false, isAdmin = false, now = new Date() }) => {
  const visibility = isAdmin ? ['public', 'authenticated', 'admin'] : authenticated ? ['public', 'authenticated'] : ['public'];
  const stored = await AIKnowledgeArticle.find({ status: 'approved', visibility: { $in: visibility }, reviewBy: { $gte: now } }).limit(100).lean().catch(() => []);
  const candidates = rankKnowledgeArticles(query, [...SYSTEM_ARTICLES, ...stored], responseStyle);
  const best = candidates[0];
  if (!best || best.confidence < 25) return { answered: false, text: '', citations: [], reason: 'NO_APPROVED_GROUNDING' };
  return { answered: true, text: best.answer, citations: [best.citation], confidence: best.confidence, articleVersion: best.version, policy: 'approved-citations-only' };
};

const checksumKnowledgeArticle = (value) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

export { SYSTEM_ARTICLES, answerKnowledgeQuery, checksumKnowledgeArticle, isKnowledgeQuery, rankKnowledgeArticles };
