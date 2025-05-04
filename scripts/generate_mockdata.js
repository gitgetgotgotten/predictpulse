import fs from 'fs';
import {v4 as uuidv4} from 'uuid';

function generateMockData(visits = 200) {
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
  // Realistic screen widths based on device types
  const screenWidths = [
    1920, // Desktop
    1366, // Laptop
    375,  // Mobile
    1440, // Desktop
    768,  // Tablet
    412,  // Mobile
    2560  // High-res desktop
  ];
  const assets = {
    Home: ['page1.jpg', 'fonts.css', 'utils.js', 'font.woff2', 'index-.*.js', 'index-.*.css'],
    ProductList: ['page2.jpg', 'fonts.css', 'utils.js', 'font.woff2', 'index-.*.js', 'index-.*.css'],
    ProductDetails: ['page3.jpg', 'fonts.css', 'utils.js', 'font.woff2', 'index-.*.js', 'index-.*.css'],
    About: ['page4.jpg', 'fonts.css', 'utils.js', 'font.woff2', 'index-.*.js', 'index-.*.css'],
    Contact: ['page5.jpg', 'fonts.css', 'utils.js', 'font.woff2', 'index-.*.js', 'index-.*.css']
  };
  const logs = [];
  let currentPage = 'Home';
  let navPath = ['Home'];
  const sessionId = uuidv4();

  for (let i = 0; i < visits; i++) {
    const probs = transitionProbs[currentPage];
    let rand = Math.random();
    let cumulative = 0;
    for (const [nextPage, prob] of Object.entries(probs)) {
      cumulative += prob;
      if (rand <= cumulative) {
        currentPage = nextPage;
        break;
      }
    }
    navPath.push(currentPage);
    const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    // Simulate realistic load times (e.g., mobile slower, desktop faster)
    const isMobile = screenWidths[Math.floor(Math.random() * screenWidths.length)] <= 768;
    const loadTime = isMobile ? 100 + Math.random() * 400 : 50 + Math.random() * 200;
    logs.push({
      visitId: `${sessionId}-${uuidv4()}`,
      page: currentPage,
      timestamp: new Date(Date.now() + i * 6000).toISOString(),
      userAgent,
      navPath: [...navPath],
      assets: assets[currentPage].map(url => ({
        url: `/predictpulse/assets/${url}`,
        type: url.endsWith('.jpg') ? 'img' : url.endsWith('.css') ? 'style' : url.endsWith('.js') ? 'script' : 'font',
        fromCache: Math.random() > 0.3
      })),
      screenWidth: screenWidths[Math.floor(Math.random() * screenWidths.length)],
      loadTime
    });
  }
  fs.writeFileSync('predictpulse_mockdata.json', JSON.stringify(logs, null, 2));
  console.log(`Generated ${visits} mock visits.`);
}

generateMockData(200);