export function predictNextPage(data) {
  // Preprocessing
  const page = data.page?.toLowerCase() || 'home';
  const browser = data.browser?.toLowerCase() || 'chrome';
  const device = data.device?.toLowerCase() || 'other';
  const screenWidth = data.screenWidth || 1920;
  const loadTime = data.loadTime || 100;
  const navPath = data.navPath || [page];
  const prevPage = navPath.length >= 2 ? navPath[navPath.length - 2].toLowerCase() : 'none';
  const transition = `${page}_unknown`;
  const transitionFreq = {"productlist_about": 297, "about_home": 333, "home_productlist": 306, "productlist_home": 291, "home_contact": 240, "contact_about": 231, "home_home": 343, "home_about": 338, "about_about": 302, "about_contact": 252, "contact_home": 248, "productlist_productlist": 269, "productlist_contact": 196, "about_productlist": 270, "home_productdetails": 88, "productdetails_productdetails": 25, "productdetails_productlist": 69, "contact_contact": 190, "contact_productlist": 220, "productlist_productdetails": 82, "productdetails_contact": 78, "productdetails_home": 101, "contact_productdetails": 67, "productdetails_about": 76, "about_productdetails": 87};
  const transition_frequency = transitionFreq[transition] || 0;
  // One-hot encoding
  const oheCategories = {"page": ["about", "contact", "home", "productdetails", "productlist"], "prev_page": ["about", "contact", "home", "productdetails", "productlist"], "device": ["iphone", "mac", "other"], "browser": ["chrome", "firefox", "mobile safari", "safari"]};
  const oheFeatureNames = ["page_about", "page_contact", "page_home", "page_productdetails", "page_productlist", "prev_page_about", "prev_page_contact", "prev_page_home", "prev_page_productdetails", "prev_page_productlist", "device_iphone", "device_mac", "device_other", "browser_chrome", "browser_firefox", "browser_mobile safari", "browser_safari"];
  const encodedFeatures = {};
  oheFeatureNames.forEach(name => encodedFeatures[name] = 0);
  ['page', 'prev_page', 'device', 'browser'].forEach((col, colIdx) => {
    const value = col === 'page' ? page : col === 'prev_page' ? prevPage : col === 'device' ? device : browser;
    const categories = oheCategories[col];
    const idx = categories.indexOf(value);
    if (idx !== -1) encodedFeatures[`${col}_${value}`] = 1;
  });
  // Standard scaling
  const scaler = {"mean": [1164.744548909782, 251.70896166330726, 0.0], "scale": [542.8516605324701, 115.7803236615626, 1.0]};
  const numericCols = ['screenWidth', 'loadTime', 'transition_frequency'];
  const numericFeatures = {};
  numericCols.forEach((col, idx) => {
    const value = col === 'screenWidth' ? screenWidth : col === 'loadTime' ? loadTime : transition_frequency;
    numericFeatures[col] = (value - scaler.mean[idx]) / scaler.scale[idx];
  });
  // Combine features
  const featureNames = ["screenWidth", "loadTime", "transition_frequency", "page_about", "page_contact", "page_home", "page_productdetails", "page_productlist", "prev_page_about", "prev_page_contact", "prev_page_home", "prev_page_productdetails", "prev_page_productlist", "device_iphone", "device_mac", "device_other", "browser_chrome", "browser_firefox", "browser_mobile safari", "browser_safari"];
  const features = featureNames.map(name => numericFeatures[name] || encodedFeatures[name] || 0);
  // Decision tree
  if (features[0] <= 0.438896) {
    if (features[1] <= 1.105795) {
      if (features[13] <= 0.500000) {
        return 'productlist';
      } else {
        return 'about';
      }
    } else {
      if (features[16] <= 0.500000) {
        return 'productdetails';
      } else {
        if (features[9] <= 0.500000) {
          return 'contact';
        } else {
          if (features[15] <= 0.500000) {
            return 'productdetails';
          } else {
            return 'productdetails';
          }
        }
      }
    }
  } else {
    if (features[1] <= 1.661146) {
      if (features[19] <= 0.500000) {
        return 'productlist';
      } else {
        return 'contact';
      }
    } else {
      if (features[3] <= 0.500000) {
        if (features[18] <= 0.500000) {
          return 'productlist';
        } else {
          return 'home';
        }
      } else {
        return 'productdetails';
      }
    }
  }
}