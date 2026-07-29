const id = (value) => value?._id?.toString?.() || value?.toString?.() || '';
const plain = (value) => value?.toObject ? value.toObject() : structuredClone(value || {});

export const minimalUser = (user) => user ? { _id: user._id, fullName: user.fullName, profileImage: user.profileImage } : null;
export const contactUser = (user, { includeStudentId = false } = {}) => {
  if (!user) return null;
  const output = { ...minimalUser(user), email: user.email || '', phone: user.phone || '' };
  if (includeStudentId) output.studentId = user.studentId || '';
  return output;
};

export const itemView = (item, viewer) => {
  const output = plain(item);
  const reporter = output.userId;
  const viewerId = id(viewer);
  const owner = Boolean(viewerId) && id(reporter) === viewerId;
  const connected = Boolean(viewerId) && id(output.connectedUserId) === viewerId;
  const admin = viewer?.role === 'admin';
  // Legacy records may still contain contactVisibility="public". Never use that
  // flag to bypass the human-approved participant/contact-sharing workflow.
  const maySeeContact = owner || connected || admin;
  output.userId = maySeeContact
    ? { ...minimalUser(reporter), ...(output.contactPreference !== 'phone' ? { email: reporter?.email || '' } : {}), ...(output.contactPreference !== 'email' ? { phone: reporter?.phone || '' } : {}) }
    : minimalUser(reporter);
  if (!owner && !connected && !admin) {
    delete output.connectedUserId;
    delete output.connectedAt;
  }
  delete output.__v;
  return output;
};

export const claimView = async (claim, viewer, privateAssetView) => {
  const output = plain(claim);
  const claimant = output.claimantId;
  const item = output.foundItemId || output.lostItemId;
  const reporter = item?.userId;
  const viewerId = id(viewer);
  const isAdmin = viewer?.role === 'admin';
  const isClaimant = id(claimant) === viewerId;
  const isReporter = id(reporter) === viewerId;
  const contactUnlocked = isAdmin || output.status === 'approved' || output.isContactShared;
  output.claimantId = (isAdmin || isClaimant || (isReporter && contactUnlocked)) ? contactUser(claimant, { includeStudentId: isAdmin || isReporter }) : minimalUser(claimant);
  if (item) item.userId = (isAdmin || isReporter || (isClaimant && contactUnlocked)) ? contactUser(reporter, { includeStudentId: isAdmin }) : minimalUser(reporter);
  if (!isAdmin) {
    if (output.riskAssessment) output.riskAssessment = { level: output.riskAssessment.level, requiresHumanReview: output.riskAssessment.requiresHumanReview, policy: 'advisory-only' };
  }
  if (!(isAdmin || isClaimant || isReporter)) {
    output.proofDescription = 'Private ownership evidence';
    output.proofImages = [];
    output.verificationAnswers = [];
  } else if (privateAssetView) {
    output.proofImages = (await Promise.all((output.proofImages || []).map(privateAssetView))).filter(Boolean);
  }
  delete output.__v;
  return output;
};
