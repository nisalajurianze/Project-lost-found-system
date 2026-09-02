const INVALID_ITEM_IDS = new Set(['', 'undefined', 'null', '[object Object]']);

export const resolveItemId = (itemOrId) => {
  if (itemOrId && typeof itemOrId === 'object') {
    return resolveItemId(itemOrId._id ?? itemOrId.id);
  }

  const itemId = String(itemOrId ?? '').trim();
  return INVALID_ITEM_IDS.has(itemId) ? '' : itemId;
};

export const requireItemId = (itemOrId) => {
  const itemId = resolveItemId(itemOrId);
  if (!itemId) throw new Error('Invalid item ID');
  return itemId;
};
