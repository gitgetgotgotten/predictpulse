import {useUserLogger} from '../hooks/useUserLogger';
import {Link} from "react-router-dom";

export default function ProductDetails() {
  useUserLogger('ProductDetails');

  return (
    <div>
      <h1>Product Details</h1>
      <img src="/predictpulse/assets/page3.jpg" alt="Product Details"/>
      <nav>
        <Link to="/predictpulse/">Home</Link> |
        <Link to="/predictpulse/product-list">Product List</Link> |
        <Link to="/predictpulse/about">About</Link> |
        <Link to="/predictpulse/contact">Contact</Link>
      </nav>
    </div>
  );
}
