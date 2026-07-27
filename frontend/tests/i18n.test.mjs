import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(frontend, relative), 'utf8');

test('core UI has persistent English Sinhala Tamil language support', () => {
  const context = read('src/i18n/LanguageContext.jsx');
  const dictionary = read('src/i18n/translations.js');
  const main = read('src/main.jsx');
  assert.match(context, /lf-language/);
  assert.match(context, /document\.documentElement\.lang/);
  assert.match(context, /localStorage\.setItem/);
  assert.match(dictionary, /code: 'en'/);
  assert.match(dictionary, /code: 'si'/);
  assert.match(dictionary, /code: 'ta'/);
  assert.match(dictionary, /සිංහල/);
  assert.match(dictionary, /தமிழ்/);
  assert.match(main, /LanguageProvider/);
});

test('task-first navigation and principal screens consume translations', () => {
  const navbar = read('src/components/layout/Navbar.jsx');
  const mobile = read('src/components/layout/MobileBottomNav.jsx');
  const home = read('src/pages/public/Home.jsx');
  const dashboard = read('src/pages/user/Dashboard.jsx');
  assert.match(navbar, /nav\.searchItems/);
  assert.match(navbar, /nav\.reportLost/);
  assert.match(navbar, /LanguageSwitcher/);
  assert.match(mobile, /nav\.reportPrompt/);
  assert.match(home, /home\.title/);
  assert.match(dashboard, /dashboard\.needsAttention/);
});

test('guided report workflows expose the same translation contract in all supported languages', async () => {
  const { translations } = await import('../src/i18n/translations.js');
  const reportKeys = Object.keys(translations.en).filter((key) => key.startsWith('report.'));
  assert.ok(reportKeys.length >= 100);
  for (const language of ['si', 'ta']) {
    const missing = reportKeys.filter((key) => typeof translations[language]?.[key] !== 'string' || !translations[language][key].trim());
    assert.deepEqual(missing, [], `${language} is missing report workflow translations`);
  }

  const wizard = read('src/components/common/ReportItemWizard.jsx');
  const uploader = read('src/components/common/ImageUpload.jsx');
  const privacy = read('src/components/common/ImagePrivacyReview.jsx');
  const suggestions = read('src/components/common/AISuggestionReview.jsx');
  assert.match(wizard, /useLanguage/);
  assert.match(wizard, /report\.photoTitle/);
  assert.match(wizard, /report\.reviewTitle/);
  assert.match(uploader, /report\.uploadChooseMethod/);
  assert.match(privacy, /report\.privacyReviewTitle/);
  assert.match(suggestions, /report\.aiReviewTitle/);
});


test('claim and notification workflows have complete trilingual translation contracts', async () => {
  const { translations } = await import('../src/i18n/translations.js');
  for (const prefix of ['claim.', 'notifications.']) {
    const keys = Object.keys(translations.en).filter((key) => key.startsWith(prefix));
    assert.ok(keys.length >= (prefix === 'claim.' ? 45 : 20));
    for (const language of ['si', 'ta']) {
      const missing = keys.filter((key) => typeof translations[language]?.[key] !== 'string' || !translations[language][key].trim());
      assert.deepEqual(missing, [], `${language} is missing ${prefix} translations`);
    }
  }

  const claim = read('src/components/common/ClaimModal.jsx');
  const notifications = read('src/pages/user/Notifications.jsx');
  assert.match(claim, /useLanguage/);
  assert.match(claim, /claim\.stepConfirm/);
  assert.match(claim, /claim\.humanDecisionDesc/);
  assert.match(notifications, /useLanguage/);
  assert.match(notifications, /notifications\.preferencesDesc/);
  assert.match(notifications, /notifications\.emptyTitle/);
});


test('assistant interface has complete trilingual labels and privacy notices', async () => {
  const { translations } = await import('../src/i18n/translations.js');
  const keys = Object.keys(translations.en).filter((key) => key.startsWith('assistant.'));
  assert.ok(keys.length >= 55);
  for (const language of ['si', 'ta']) {
    const missing = keys.filter((key) => typeof translations[language]?.[key] !== 'string' || !translations[language][key].trim());
    assert.deepEqual(missing, [], `${language} is missing assistant translations`);
  }
  const assistant = read('src/components/common/AIChatbot.jsx');
  assert.match(assistant, /useLanguage/);
  assert.match(assistant, /assistant\.historyDesc/);
  assert.match(assistant, /assistant\.ownershipNote/);
  assert.match(assistant, /assistant\.showingResults/);
});


test('match claim-card and notification-card controls are trilingual', async () => {
  const { translations } = await import('../src/i18n/translations.js');
  for (const prefix of ['match.', 'claimCard.', 'notificationCard.']) {
    const keys = Object.keys(translations.en).filter((key) => key.startsWith(prefix));
    assert.ok(keys.length > 0);
    for (const language of ['si', 'ta']) {
      const missing = keys.filter((key) => typeof translations[language]?.[key] !== 'string' || !translations[language][key].trim());
      assert.deepEqual(missing, [], `${language} is missing ${prefix} translations`);
    }
  }
  const match = read('src/components/cards/MatchCard.jsx');
  const explanation = read('src/components/common/MatchExplanation.jsx');
  const claimCard = read('src/components/cards/ClaimCard.jsx');
  const notificationCard = read('src/components/cards/NotificationCard.jsx');
  assert.match(match, /match\.correctionDesc/);
  assert.match(explanation, /match\.ownershipNotice/);
  assert.match(claimCard, /claimCard\.confirmHandover/);
  assert.match(notificationCard, /notificationCard\.delete/);
});


test('item-detail and ownership-claims recovery screens are trilingual', async () => {
  const { translations } = await import('../src/i18n/translations.js');
  for (const prefix of ['detail.', 'myClaims.']) {
    const keys = Object.keys(translations.en).filter((key) => key.startsWith(prefix));
    assert.ok(keys.length >= (prefix === 'detail.' ? 45 : 20));
    for (const language of ['si', 'ta']) {
      const missing = keys.filter((key) => typeof translations[language]?.[key] !== 'string' || !translations[language][key].trim());
      assert.deepEqual(missing, [], `${language} is missing ${prefix} translations`);
    }
  }
  const lost = read('src/pages/public/LostItemDetail.jsx');
  const found = read('src/pages/public/FoundItemDetail.jsx');
  const claims = read('src/pages/user/MyClaims.jsx');
  assert.match(lost, /detail\.contactProtected/);
  assert.match(found, /detail\.finderProtected/);
  assert.match(claims, /myClaims\.approveDesc/);
});

test('student report lists and AI recommendation history are trilingual', async () => {
  const { translations } = await import('../src/i18n/translations.js');
  for (const prefix of ['myItems.', 'myMatches.']) {
    const keys = Object.keys(translations.en).filter((key) => key.startsWith(prefix));
    assert.ok(keys.length >= (prefix === 'myItems.' ? 25 : 10));
    for (const language of ['si', 'ta']) {
      const missing = keys.filter((key) => typeof translations[language]?.[key] !== 'string' || !translations[language][key].trim());
      assert.deepEqual(missing, [], `${language} is missing ${prefix} translations`);
    }
  }

  const lost = read('src/pages/user/MyLostItems.jsx');
  const found = read('src/pages/user/MyFoundItems.jsx');
  const matches = read('src/pages/user/MyMatches.jsx');
  assert.match(lost, /myItems\.deleteLostConfirm/);
  assert.match(found, /myItems\.deleteFoundConfirm/);
  assert.match(matches, /myMatches\.emptySuggestedDesc/);
});


test('profile and password settings are trilingual and password visibility is localized', async () => {
  const { translations } = await import('../src/i18n/translations.js');
  const required = [
    'profile.title', 'profile.subtitle', 'profile.accountInfo', 'profile.editProfile',
    'profile.chooseImage', 'profile.fullName', 'profile.studentId', 'profile.phone',
    'profile.emailLocked', 'profile.save', 'profile.changePassword',
    'profile.currentPassword', 'profile.newPassword', 'profile.confirmPassword',
    'profile.passwordHelper', 'profile.update', 'profile.showPassword', 'profile.hidePassword',
    'common.cancel', 'common.edit',
  ];
  for (const language of ['en', 'si', 'ta']) {
    for (const key of required) assert.ok(translations[language][key], `${language} missing ${key}`);
  }
  const profile = read('src/pages/user/Profile.jsx');
  const input = read('src/components/common/Input.jsx');
  assert.match(profile, /useLanguage/);
  assert.match(profile, /profile\.showPassword/);
  assert.match(input, /showPasswordLabel/);
  assert.match(input, /hidePasswordLabel/);
});


test('signed-out authentication and account-recovery journeys are trilingual', async () => {
  const { translations } = await import('../src/i18n/translations.js');
  const authKeys = Object.keys(translations.en).filter((key) => key.startsWith('auth.'));
  assert.ok(authKeys.length >= 80);
  for (const language of ['si', 'ta']) {
    const missing = authKeys.filter((key) => typeof translations[language]?.[key] !== 'string' || !translations[language][key].trim());
    assert.deepEqual(missing, [], `${language} is missing authentication translations`);
  }

  for (const file of ['Login.jsx', 'Register.jsx', 'ForgotPassword.jsx', 'ResetPassword.jsx', 'VerifyEmail.jsx']) {
    const source = read(`src/pages/public/${file}`);
    assert.match(source, /useLanguage/);
    assert.match(source, /auth\./);
  }

  const login = read('src/pages/public/Login.jsx');
  const register = read('src/pages/public/Register.jsx');
  const reset = read('src/pages/public/ResetPassword.jsx');
  const verify = read('src/pages/public/VerifyEmail.jsx');
  assert.match(login, /auth\.rememberMe/);
  assert.match(register, /auth\.registrationVerify/);
  assert.match(reset, /auth\.passwordPolicy/);
  assert.match(verify, /auth\.verificationExpired/);
});


test('public information support and legacy directory controls are trilingual', async () => {
  const { translations } = await import('../src/i18n/translations.js');
  for (const prefix of ['about.', 'contact.', 'directory.', 'filters.', 'pagination.']) {
    const keys = Object.keys(translations.en).filter((key) => key.startsWith(prefix));
    assert.ok(keys.length > 0);
    for (const language of ['si', 'ta']) {
      const missing = keys.filter((key) => typeof translations[language]?.[key] !== 'string' || !translations[language][key].trim());
      assert.deepEqual(missing, [], `${language} is missing ${prefix} translations`);
    }
  }

  const about = read('src/pages/public/About.jsx');
  const contact = read('src/pages/public/Contact.jsx');
  const lost = read('src/pages/public/LostItems.jsx');
  const found = read('src/pages/public/FoundItems.jsx');
  const filter = read('src/components/common/SearchFilter.jsx');
  const pagination = read('src/components/common/Pagination.jsx');
  assert.match(about, /about\.publicPrivacyDesc/);
  assert.match(contact, /contact\.signInRequired/);
  assert.match(lost, /directory\.noLostTitle/);
  assert.match(found, /directory\.noFoundTitle/);
  assert.match(filter, /filters\.startDate/);
  assert.match(pagination, /pagination\.pageOf/);
});


test('admin navigation and operational dashboard are trilingual', async () => {
  const { translations } = await import('../src/i18n/translations.js');
  const keys = Object.keys(translations.en).filter((key) => key.startsWith('admin.'));
  assert.ok(keys.length >= 50);
  for (const language of ['si', 'ta']) {
    const missing = keys.filter((key) => typeof translations[language]?.[key] !== 'string' || !translations[language][key].trim());
    assert.deepEqual(missing, [], `${language} is missing admin translations`);
  }
  const layout = read('src/components/layout/AdminLayout.jsx');
  const dashboard = read('src/pages/admin/AdminDashboard.jsx');
  assert.match(layout, /admin\.panelLabel/);
  assert.match(layout, /admin\.locationKnowledge/);
  assert.match(dashboard, /admin\.urgentDesc/);
  assert.match(dashboard, /admin\.providerSuccess/);
  assert.match(dashboard, /admin\.successfulHandbacks/);
});


test('critical administrator review queues are trilingual and preserve human-decision wording', async () => {
  const { translations } = await import('../src/i18n/translations.js');
  for (const prefix of ['claims.', 'matches.', 'location.', 'aiFeedback.']) {
    const keys = Object.keys(translations.en).filter((key) => key.startsWith(prefix));
    assert.ok(keys.length >= 10, `${prefix} should expose a meaningful admin-review contract`);
    for (const language of ['si', 'ta']) {
      const missing = keys.filter((key) => typeof translations[language]?.[key] !== 'string' || !translations[language][key].trim());
      assert.deepEqual(missing, [], `${language} is missing ${prefix} translations`);
    }
  }

  const claims = read('src/pages/admin/ManageClaims.jsx');
  const matches = read('src/pages/admin/ManageMatches.jsx');
  const locations = read('src/pages/admin/LocationKnowledge.jsx');
  const feedback = read('src/pages/admin/AIFeedbackReview.jsx');
  for (const source of [claims, matches, locations, feedback]) assert.match(source, /useLanguage/);
  assert.match(claims, /claims\.adminSubtitle/);
  assert.match(matches, /match\.bandVeryStrong/);
  assert.match(matches, /matches\.reviewSuccess/);
  assert.match(locations, /location\.reviewSubtitle/);
  assert.match(feedback, /aiFeedback\.subtitle/);
});
