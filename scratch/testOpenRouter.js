(async () => {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer sk-or-v1-fake-key' },
    body: JSON.stringify({ model: 'deepseek-r1-is-not-valid', messages: [{ role: 'user', content: 'hi' }] })
  });
  console.log(res.status, await res.text());
})();
