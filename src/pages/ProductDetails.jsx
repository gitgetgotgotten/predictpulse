import {useUserLogger} from '../hooks/useUserLogger';
import {useSmartPreload} from '../hooks/useSmartPreload';
import {Link} from "react-router-dom";

export default function ProductDetails() {
  useUserLogger('ProductDetails');
  useSmartPreload('ProductDetails');

  return (
    <div>
      <h1>Product Details</h1>
      <img src="/predictpulse/assets/page3.jpg" alt="Product Details"/>
      <nav>
        <Link to="/">Home</Link> |
        <Link to="/product-list">Product List</Link> |
        <Link to="/about">About</Link> |
        <Link to="/contact">Contact</Link>
      </nav>
    </div>
  );
}
