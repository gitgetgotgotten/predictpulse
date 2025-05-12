export function predictNextPage(data) {
  if (data['page'].toLowerCase() === 'about' || data['page'].toLowerCase() === 'contact' || data['page'].toLowerCase() === 'home' || data['page'].toLowerCase() === 'productdetails') {
    if (data['loadTime'] <= 433.5) {
      return 'contact';
    } else {
      return 'about';
    }
  } else {
    if (data['device'].toLowerCase() === 'iphone' || data['device'].toLowerCase() === 'mac') {
      if (data['screenWidth'] <= 1403.0) {
        if (data['loadTime'] <= 225.2) {
          return 'about';
        } else {
          return 'productdetails';
        }
      } else {
        if (data['loadTime'] <= 407.0) {
          return 'productdetails';
        } else {
          return 'home';
        }
      }
    } else {
      if (data['loadTime'] <= 301.1) {
        if (data['screenWidth'] <= 571.5) {
          return 'productdetails';
        } else {
          return 'productdetails';
        }
      } else {
        if (data['screenWidth'] <= 1680.0) {
          return 'productdetails';
        } else {
          if (data['browser'].toLowerCase() === 'chrome') {
            return 'home';
          } else {
            return 'home';
          }
        }
      }
    }
  }
}