const cleanText = (value, max = 500) => String(value || '').trim().replace(/\s+/g, ' ').slice(0, max);

const categoryText = (item = {}) => cleanText(
  typeof item.category === 'string' ? item.category : item.category?.name,
  120,
).toLowerCase();

const buildClaimQuestions = ({ itemType, item = {} }) => {
  const name = cleanText(item.itemName, 120) || 'the item';
  const category = categoryText(item);
  const questions = [];

  if (itemType === 'FoundItem') {
    questions.push({ id: 'last-possession', question: `When and where did you last have ${name}?` });
    if (/phone|laptop|tablet|electronic|charger|earbud|headphone/.test(`${name} ${category}`.toLowerCase())) {
      questions.push({ id: 'device-detail', question: 'Describe the brand, model, case, damage, sticker, or another feature that is not obvious from the public report.' });
    } else if (/wallet|bag|purse|backpack/.test(`${name} ${category}`.toLowerCase())) {
      questions.push({ id: 'contents-detail', question: 'Describe the inner lining, compartments, contents, or a unique mark without giving full card or identity numbers.' });
    } else {
      questions.push({ id: 'unique-detail', question: 'Describe one unique feature that only the owner is likely to know.' });
    }
    questions.push({ id: 'supporting-proof', question: 'What supporting evidence can you provide, such as an older photo, receipt, packaging, or partial identifier?' });
  } else {
    questions.push({ id: 'found-context', question: `Where and when did you find ${name}?` });
    questions.push({ id: 'custody-detail', question: 'Describe how the item is currently stored and one feature that confirms you have the same item.' });
    questions.push({ id: 'safe-handover', question: 'Which university office or other safe public handover point could you use?' });
  }

  return questions.slice(0, 4);
};

const parseVerificationAnswers = (value) => {
  if (value === undefined || value === null || value === '') return [];
  let parsed = value;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { throw new Error('Verification answers must be valid JSON.'); }
  }
  if (!Array.isArray(parsed) || parsed.length > 5) throw new Error('Verification answers must be an array of at most 5 entries.');
  return parsed.map((entry) => {
    const question = cleanText(entry?.question, 300);
    const answer = cleanText(entry?.answer, 1000);
    if (!question || answer.length < 2) throw new Error('Every verification answer must include a question and an answer.');
    return { question, answer };
  });
};

const assessClaimEvidence = ({ proofDescription, files = [], verificationAnswers = [] }) => {
  const description = cleanText(proofDescription, 2000);
  const answers = Array.isArray(verificationAnswers) ? verificationAnswers : [];
  const imageCount = Math.min(3, Array.isArray(files) ? files.length : 0);
  const warnings = [];
  let score = 0;

  if (description.length >= 120) score += 35;
  else if (description.length >= 50) score += 25;
  else if (description.length >= 10) { score += 12; warnings.push('Add more specific ownership or custody details.'); }

  const substantiveAnswers = answers.filter((entry) => cleanText(entry?.answer, 1000).length >= 10).length;
  score += Math.min(35, substantiveAnswers * 12);
  if (substantiveAnswers < 2) warnings.push('Answer at least two verification questions with specific details.');

  if (imageCount > 0) score += Math.min(25, imageCount * 10);
  else warnings.push('A private supporting image is optional but may help human review.');

  if (/(password|pin\s*code|cvv|full\s*card|bank\s*password)/i.test(description + ' ' + answers.map((entry) => entry.answer).join(' '))) {
    score = Math.max(0, score - 20);
    warnings.push('Remove passwords, PINs, CVVs, and full payment-card details.');
  }

  score = Math.min(100, Math.max(0, score));
  const level = score >= 70 ? 'strong' : score >= 40 ? 'fair' : 'weak';
  return { score, level, warnings: [...new Set(warnings)].slice(0, 5), assessedAt: new Date() };
};

export { buildClaimQuestions, parseVerificationAnswers, assessClaimEvidence };
