import {useUserLogger} from '../hooks/useUserLogger';
import {useSmartPreload} from '../hooks/useSmartPreload';
import {Link} from "react-router-dom";

export default function ProductList() {
  useUserLogger('ProductList');
  useSmartPreload('ProductList');

  return (
    <div>
      <h1>Product List</h1>
      <img src="/predictpulse/assets/page2.jpg" alt="Product List"/>
      <nav>
        <Link to="/">Home</Link> |
        <Link to="/product-details">Product Details</Link> |
        <Link to="/about">About</Link> |
        <Link to="/contact">Contact</Link>
      </nav>
    </div>
  );
}
