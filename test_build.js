const https = require('https');
https.get('https://smart-lost-and-found-system.vercel.app/', (res) => {
  let html = '';
  res.on('data', d => html += d);
  res.on('end', () => {
    const match = html.match(/src="([^"]+assets\/index[^"]+\.js)"/);
    if(match) {
      https.get('https://smart-lost-and-found-system.vercel.app' + match[1], (r) => {
        let js = '';
        r.on('data', d => js += d);
        r.on('end', () => {
          console.log('Build includes https replace:', js.includes('replace(/^http:\\/\\//i,"https://")') || js.includes('replace(/^http:\\/\\//i, "https://")') || js.includes('replace(/^http'));
        });
      });
    }
  });
});
