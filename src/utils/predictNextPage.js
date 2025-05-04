export function predictNextPage(data) {
if (data['page'] <= 3.5) {
  if (data['page'] <= 1.5) {
    if (data['page'] <= 0.5) {
      if (data['loadTime'] <= 152.48853302001953) {
        return 'Contact';
      } else {
        if (data['screenWidth'] <= 1403.0) {
          return 'Contact';
        } else {
          return 'Home';
        }
      }
    } else {
      if (data['loadTime'] <= 132.1871109008789) {
        return 'Home';
      } else {
        if (data['loadTime'] <= 195.63497161865234) {
          return 'Home';
        } else {
          return 'Home';
        }
      }
    }
  } else {
    if (data['page'] <= 2.5) {
      if (data['loadTime'] <= 105.62291717529297) {
        return 'About';
      } else {
        if (data['prev_page'] <= 1.5) {
          return 'ProductList';
        } else {
          return 'ProductList';
        }
      }
    } else {
      if (data['loadTime'] <= 163.8321990966797) {
        return 'About';
      } else {
        return 'Home';
      }
    }
  }
} else {
  if (data['loadTime'] <= 199.06356048583984) {
    if (data['loadTime'] <= 107.90646362304688) {
      return 'ProductDetails';
    } else {
      return 'ProductDetails';
    }
  } else {
    return 'ProductDetails';
  }
}
}
