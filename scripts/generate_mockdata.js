import { writeFileSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

function generateMockData(numVisits) {
  const pages = ['Home', 'About', 'Contact', 'ProductList', 'ProductDetails'];
  const browsers = ['Chrome', 'Firefox', 'Safari', 'Mobile Safari'];
  const devices = ['iphone', 'mac', 'other'];
  const screenWidths = [375, 768, 1366, 1440, 1920];
  const userAgents = {
    'Chrome': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    'Firefox': 'Mozilla/5.0 (X11; Linux x86_64; rv:129.0) Gecko/20100101 Firefox/129.0',
    'Safari': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    'Mobile Safari': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  };
  const assets = [
    { url: '/predictpulse/assets/page{pageNum}.jpg', type: 'img', fromCache: false },
    { url: '/predictpulse/assets/fonts.css', type: 'style', fromCache: true },
    { url: '/predictpulse/assets/utils.js', type: 'script', fromCache: true },
    { url: '/predictpulse/assets/font.woff2', type: 'font', fromCache: true },
    { url: '/predictpulse/assets/index-.*.js', type: 'script', fromCache: false },
    { url: '/predictpulse/assets/index-.*.css', type: 'style', fromCache: true }
  ];

  const visits = [];
  const sessionId = uuidv4();
  let timestamp = new Date('2025-05-10T23:00:00.000Z');
  const pageTransitions = {
    'Home': ['ProductList', 'About', 'Contact'],
    'About': ['Contact', 'Home', 'ProductList'],
    'Contact': ['Home', 'About', 'ProductList'],
    'ProductList': ['ProductDetails', 'Home', 'About'],
    'ProductDetails': ['About', 'Home', 'Contact']
  };
  const transitionCounts = {};

  for (let i = 0; i < numVisits; i++) {
    const browser = browsers[Math.floor(Math.random() * browsers.length)];
    const device = devices[Math.floor(Math.random() * devices.length)];
    const screenWidth = screenWidths[Math.floor(Math.random() * screenWidths.length)];
    const navPath = [];
    let currentPage = pages[Math.floor(Math.random() * pages.length)];
    navPath.push(currentPage);
    const pathLength = Math.floor(Math.random() * 5) + 2;

    for (let j = 1; j < pathLength; j++) {
      const possibleNextPages = pageTransitions[currentPage];
      const nextPage = possibleNextPages[Math.floor(Math.random() * possibleNextPages.length)];
      navPath.push(nextPage);
      const transition = `${currentPage} -> ${nextPage}`;
      transitionCounts[transition] = (transitionCounts[transition] || 0) + 1;
      currentPage = nextPage;
    }

    const pageNum = pages.indexOf(currentPage) + 1;
    const visitAssets = assets.map(asset => ({
      ...asset,
      url: asset.url.replace('{pageNum}', pageNum),
      fromCache: Math.random() > 0.3
    }));

    visits.push({
      visitId: `${sessionId}-${uuidv4()}`,
      page: currentPage,
      timestamp: timestamp.toISOString(),
      userAgent: userAgents[browser],
      navPath,
      assets: visitAssets,
      screenWidth,
      loadTime: 50 + Math.random() * 400,
      browser,
      device
    });

    timestamp = new Date(timestamp.getTime() + 6000);
  }

  console.log(`Generated ${numVisits} mock visits.`);
  console.log('Page distribution:', visits.reduce((acc, v) => {
    acc[v.page] = (acc[v.page] || 0) + 1;
    return acc;
  }, {}));
  console.log('Browser distribution:', visits.reduce((acc, v) => {
    acc[v.browser] = (acc[v.browser] || 0) + 1;
    return acc;
  }, {}));
  console.log('Device distribution:', visits.reduce((acc, v) => {
    acc[v.device] = (acc[v.device] || 0) + 1;
    return acc;
  }, {}));
  console.log('Transition counts:', transitionCounts);

  writeFileSync('predictpulse_mockdata.json', JSON.stringify(visits, null, 2));
}

generateMockData(1000);