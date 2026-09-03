const PROMPT_VERSIONS = Object.freeze({
  'assistant-chat': 'assistant-chat-v2',
  'item-image-analysis': 'item-image-analysis-v2',
  'item-image-comparison': 'item-image-comparison-v1',
  'report-auto-fill': 'report-auto-fill-v2',
  'category-suggestion': 'category-suggestion-v1',
  'keyword-normalisation': 'keyword-normalisation-v1',
  generic: 'generic-v1',
});

const promptVersionForPurpose = (purpose = 'generic') => PROMPT_VERSIONS[purpose] || PROMPT_VERSIONS.generic;

const getPromptRegistry = () => Object.entries(PROMPT_VERSIONS).map(([purpose, version]) => ({ purpose, version }));

export { PROMPT_VERSIONS, getPromptRegistry, promptVersionForPurpose };
