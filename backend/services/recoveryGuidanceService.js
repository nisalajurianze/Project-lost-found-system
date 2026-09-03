const RECOVERY_PATTERN = /\b(?:claim|recover|recovery|handover|hand over|pickup|pick up|owner|return item|safe meeting)\b|හිමිකම්|භාරදෙ|ආපසු|உரிமை|ஒப்படை|மீட்பு/iu;

const COPY = {
  en: {
    intro: 'Use the verified recovery flow: review the match, submit ownership evidence privately, wait for the report owner or admin review, then arrange a safe handover.',
    signIn: 'Sign in first so only authorised participants can view claim and handover details.',
    pending: 'You already have a pending claim. Open it for the current status and next action.',
    match: 'You have a suggested match. Review its public evidence before starting a claim.',
    safety: 'Do not share passwords, PINs, full card numbers, or home addresses. Meet at an approved campus point and mark recovery only after the item is handed over.',
  },
  singlish: {
    intro: 'Verified recovery flow eka use karanna: match eka balanna, ownership evidence private widiyata denna, owner/admin review eka enakan inna, passe safe handover ekak arrange karanna.',
    signIn: 'Claim saha handover details authorised ayata witharak pennanna mulin sign in wenna.',
    pending: 'Oyata pending claim ekak tiyenawa. Dan status eka saha next action eka balanna eka open karanna.',
    match: 'Oyata suggested match ekak tiyenawa. Claim ekak patan ganna kalin public evidence balanna.',
    safety: 'Passwords, PIN, full card numbers, home address share karanna epa. Approved campus point ekaka meet wela item eka athata labunata passe witharak recovered kiyala mark karanna.',
  },
  si: {
    intro: 'තහවුරු කළ recovery flow එක භාවිත කරන්න: match එක බලන්න, හිමිකම් සාක්ෂි පුද්ගලිකව යවන්න, owner/admin review එක බලා සිටින්න, පසුව ආරක්ෂිත භාරදීමක් සකස් කරන්න.',
    signIn: 'Claim සහ handover විස්තර බලයලත් පාර්ශ්වයන්ට පමණක් පෙන්වීමට මුලින් sign in වෙන්න.',
    pending: 'ඔබට දැනට pending claim එකක් තිබෙනවා. වත්මන් තත්ත්වය සහ ඊළඟ පියවර සඳහා එය විවෘත කරන්න.',
    match: 'ඔබට යෝජිත match එකක් තිබෙනවා. Claim එකක් ආරම්භ කිරීමට පෙර public evidence බලන්න.',
    safety: 'Passwords, PIN, සම්පූර්ණ card numbers හෝ ගෙදර ලිපින share නොකරන්න. අනුමත campus ස්ථානයක හමුවී භාණ්ඩය ලැබුණු පසු පමණක් recovered ලෙස සලකුණු කරන්න.',
  },
  ta: {
    intro: 'சரிபார்க்கப்பட்ட recovery flow-ஐ பயன்படுத்தவும்: match-ஐ பார்க்கவும், உரிமைச் சான்றை தனிப்பட்ட முறையில் சமர்ப்பிக்கவும், owner/admin மதிப்பாய்வுக்காக காத்திருந்து பாதுகாப்பான ஒப்படைப்பை ஏற்பாடு செய்யவும்.',
    signIn: 'Claim மற்றும் handover விவரங்கள் அங்கீகரிக்கப்பட்டவர்களுக்கு மட்டும் தெரிய முதலில் sign in செய்யவும்.',
    pending: 'உங்களுக்கு pending claim உள்ளது. தற்போதைய நிலை மற்றும் அடுத்த நடவடிக்கைக்காக அதைத் திறக்கவும்.',
    match: 'உங்களுக்கு suggested match உள்ளது. Claim தொடங்கும் முன் public evidence-ஐ பார்க்கவும்.',
    safety: 'Passwords, PIN, முழு card numbers அல்லது வீட்டு முகவரிகளை பகிர வேண்டாம். அங்கீகரிக்கப்பட்ட campus இடத்தில் சந்தித்து பொருள் கிடைத்த பிறகே recovered என குறிக்கவும்.',
  },
};

const isRecoveryQuery = (message) => RECOVERY_PATTERN.test(String(message || '').normalize('NFKC'));

const buildRecoveryGuidance = ({ responseStyle = 'en', authenticated = false, summary = {} } = {}) => {
  const text = COPY[responseStyle] || COPY.en;
  if (!authenticated) return {
    text: `${text.intro} ${text.signIn}`,
    safetyNotice: text.safety,
    actions: [{ type: 'sign_in', url: '/login' }],
  };
  if (Number(summary.pendingClaims) > 0) return {
    text: `${text.pending} ${text.safety}`,
    safetyNotice: text.safety,
    actions: [{ type: 'claims', url: '/dashboard/claims' }, { type: 'matches', url: '/dashboard/my-matches' }],
  };
  if (Number(summary.suggestedMatches) > 0) return {
    text: `${text.match} ${text.safety}`,
    safetyNotice: text.safety,
    actions: [{ type: 'matches', url: '/dashboard/my-matches' }, { type: 'claims', url: '/dashboard/claims' }],
  };
  return {
    text: `${text.intro} ${text.safety}`,
    safetyNotice: text.safety,
    actions: [{ type: 'search', url: '/search' }, { type: 'claims', url: '/dashboard/claims' }],
  };
};

export { buildRecoveryGuidance, isRecoveryQuery };
