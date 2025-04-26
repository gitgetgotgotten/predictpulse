// scripts/generate_mockdata.js
import fs from 'fs';
import {UAParser} from "ua-parser-js";

function generateMockData(visits = 50) {
  const transitionProbs = {
    'Home': {'ProductList': 0.6, 'About': 0.3, 'Contact': 0.1},
    'ProductList': {'ProductDetails': 0.7, 'Home': 0.2, 'About': 0.1},
    'ProductDetails': {'About': 0.5, 'Home': 0.3, 'Contact': 0.2},
    'About': {'Contact': 0.6, 'Home': 0.3, 'ProductList': 0.1},
    'Contact': {'Home': 0.7, 'ProductList': 0.2, 'About': 0.1}
  };
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (X11; Linux x86_64; rv:129.0) Gecko/20100101 Firefox/129.0'
  ];
  const devices = ['desktop', 'mobile', 'tablet'];
  const oses = ['Windows', 'Mac OS', 'iOS', 'Linux'];
  const browsers = ['Chrome', 'Safari', 'Firefox'];
  const screenSizes = [
    {width: 1920, height: 1080},
    {width: 1366, height: 768},
    {width: 375, height: 667},
    {width: 1440, height: 900}
  ];
  const assets = {
    Home: ['page1.jpg', 'styles.css', 'fonts.css', 'font.woff2', 'utils.js'],
    ProductList: ['page2.jpg', 'styles.css', 'fonts.css', 'font.woff2', 'utils.js'],
    ProductDetails: ['page3.jpg', 'styles.css', 'fonts.css', 'font.woff2', 'utils.js'],
    About: ['page4.jpg', 'styles.css', 'fonts.css', 'font.woff2', 'utils.js'],
    Contact: ['page5.jpg', 'styles.css', 'fonts.css', 'font.woff2', 'utils.js']
  };
  const logs = [];
  let currentPage = 'Home';
  for (let i = 0; i < visits; i++) {
    const prevPage = currentPage;
    const probs = transitionProbs[currentPage];
    const rand = Math.random();
    let cumulative = 0;
    for (const [nextPage, prob] of Object.entries(probs)) {
      cumulative += prob;
      if (rand <= cumulative) {
        currentPage = nextPage;
        break;
      }
    }
    const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    const parser = new UAParser(userAgent);
    const uaResult = parser.getResult();
    logs.push({
      time: new Date(Date.now() + i * 6000).toISOString(),
      page: currentPage,
      visitId: `${currentPage}-${new Date(Date.now() + i * 6000).toISOString()}`,
      userAgent,
      device: devices[Math.floor(Math.random() * devices.length)],
      os: uaResult.os.name || oses[Math.floor(Math.random() * oses.length)],
      browser: uaResult.browser.name || browsers[Math.floor(Math.random() * browsers.length)],
      assets: assets[currentPage].map(url => ({
        url: `/predictpulse/assets/${url}`,
        type: url.endsWith('.jpg') ? 'img' : (url.endsWith('.css') ? 'style' : (url.endsWith('.js') ? 'script' : 'other')),
        fromCache: false
      })),
      navPath: [prevPage, currentPage],
      screen: screenSizes[Math.floor(Math.random() * screenSizes.length)],
      loadTime: 50 + Math.random() * 200
    });
  }
  fs.writeFileSync('predictpulse_mockdata.json', JSON.stringify(logs, null, 2));
  console.log(`Generated ${visits} mock visits.`);
}

generateMockData(50);