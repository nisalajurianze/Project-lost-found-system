const https = require('https');

https.get('https://smart-lost-and-found-system.vercel.app/', (res) => {
  let html = '';
  res.on('data', d => html += d);
  res.on('end', () => {
    const match = html.match(/src="([^"]+assets\/index[^"]+\.js)"/);
    if(match) {
      const jsUrl = 'https://smart-lost-and-found-system.vercel.app' + match[1];
      https.get(jsUrl, (r) => {
        let js = '';
        r.on('data', d => js += d);
        r.on('end', () => {
          const apiMatch = js.match(/"(https:\/\/[^"]+api)"/g);
          console.log(Array.from(new Set(apiMatch)));
        });
      });
    }
  });
});
