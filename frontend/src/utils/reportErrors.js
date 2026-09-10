// Preserve only serializable server diagnostics across Redux's rejection path.
export const reportRejection = (error) => ({
  message: typeof error?.message === 'string' ? error.message : '',
  statusCode: Number(error?.statusCode) || 500,
  errors: Array.isArray(error?.errors) ? error.errors.filter((entry) => (
    typeof entry === 'string' || (typeof entry?.field === 'string' && typeof entry?.message === 'string')
  )).map((entry) => typeof entry === 'string' ? entry : { field: entry.field, message: entry.message }) : [],
});

export const reportFieldSteps = {
  images: 1,
  itemName: 2, category: 2, description: 2, brand: 2, model: 2,
  colors: 2, material: 2, uniqueFeatures: 2, tags: 2,
  location: 3, date: 3, storedAt: 3,
  contactPreference: 4, contactVisibility: 4, submit: 4,
};

const aliases = { lostDate: 'date', foundDate: 'date', lostLocation: 'location', foundLocation: 'location' };

export const reportErrorsForForm = (error, fallbackMessage) => {
  const fields = {};
  for (const entry of Array.isArray(error?.errors) ? error.errors : []) {
    const rawField = typeof entry?.field === 'string' ? entry.field : '';
    const field = Object.hasOwn(aliases, rawField) ? aliases[rawField] : rawField;
    const target = Object.hasOwn(reportFieldSteps, field) ? field : 'submit';
    const message = typeof entry === 'string' ? entry : entry?.message;
    if (typeof message === 'string' && message.trim()) fields[target] ||= message;
  }
  if (!Object.keys(fields).length) fields.submit = (typeof error === 'string' ? error : error?.message) || fallbackMessage;
  return fields;
};
