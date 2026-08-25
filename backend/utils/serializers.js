const id = (value) => value?._id?.toString?.() || value?.toString?.() || '';
const plain = (value) => value?.toObject ? value.toObject() : structuredClone(value || {});

export const minimalUser = (user) => user ? { _id: user._id, fullName: user.fullName, profileImage: user.profileImage } : null;
export const contactUser = (user, { includeStudentId = false } = {}) => {
  if (!user) return null;
  const output = { ...minimalUser(user), email: user.email || '', phone: user.phone || '' };
  if (includeStudentId) output.studentId = user.studentId || '';
  return output;
};

const publicLocationProjection = (output) => {
  const location = output.locationIntelligence || {};
  const verified = !location.needsReview && ['map-source-verified', 'field-verified', 'university-approved'].includes(location.verificationStatus);
  if (!verified || !location.sensitivity) {
    return { label: 'Location shared privately', intelligence: { precision: 'withheld', needsReview: true } };
  }
  if (location.sensitivity === 'restricted') {
    return {
      label: 'Restricted university area',
      intelligence: { sensitivity: 'restricted', verificationStatus: location.verificationStatus, precision: 'withheld', needsReview: false },
    };
  }
  if (location.sensitivity === 'zone-only') {
    const area = location.area || 'University area';
    return {
      label: area,
      intelligence: { area, sensitivity: 'zone-only', verificationStatus: location.verificationStatus, precision: 'approximate', needsReview: false },
    };
  }
  const label = location.canonicalName || location.area || 'University area';
  return {
    label,
    intelligence: {
      canonicalName: location.canonicalName || '',
      area: location.area || '',
      sensitivity: 'public',
      verificationStatus: location.verificationStatus,
      precision: 'exact-public',
      needsReview: false,
    },
  };
};

const publicImages = (images) => (images || [])
  .filter((image) => image?.privacyStatus === 'safe_public' && image?.url)
  .map((image) => ({ url: image.url, privacyStatus: 'safe_public' }));

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
    output.images = publicImages(output.images);
    const publicLocation = publicLocationProjection(output);
    if (Object.hasOwn(output, 'lostLocation')) output.lostLocation = publicLocation.label;
    if (Object.hasOwn(output, 'foundLocation')) output.foundLocation = publicLocation.label;
    if (Object.hasOwn(output, 'storedAt')) output.storedAt = 'Secure handover point shared after approval';
    output.locationIntelligence = publicLocation.intelligence;
  } else {
    // Never serialize provider identifiers for originals. Even privileged
    // viewers use a dedicated short-lived signed delivery path when needed.
    output.images = (output.images || []).map(({ originalAsset: _originalAsset, ...image }) => image);
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
  const contactUnlocked = isAdmin || (output.status === 'approved' && output.isContactShared === true);
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
