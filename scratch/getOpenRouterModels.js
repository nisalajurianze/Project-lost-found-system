(async () => {
  const res = await fetch('https://openrouter.ai/api/v1/models');
  const data = await res.json();
  const freeModels = data.data.filter(m => m.pricing.prompt === '0' || m.id.endsWith(':free'));
  console.log(freeModels.map(m => m.id).filter(id => id.includes('vision') || id.includes('deepseek') || id.includes('llama') || id.includes('gemini') || id.includes('qwen')).join('\n'));
})();
