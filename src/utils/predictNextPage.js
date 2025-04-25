export function predictNextPage(hour, device_encoded, os_encoded, browser_encoded, screen_width, current_page_encoded, prev_page_encoded) {
  if (current_page_encoded == 3) {
    if (os_encoded == 2) {
      if (device_encoded == 0) {
        return 'About';
      } else {
        return 'ProductList';
      }
    } else {
      return 'Contact';
    }
  } else {
    if (prev_page_encoded == 0) {
      return 'Home';
    } else {
      if (screen_width <= 1680.00) {
        return 'ProductDetails';
      } else {
        if (device_encoded == 0) {
          if (os_encoded == 1) {
            return 'ProductDetails';
          } else {
            return 'Home';
          }
        } else {
          return 'ProductDetails';
        }
      }
    }
  }
}