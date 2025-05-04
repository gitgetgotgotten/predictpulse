import {useUserLogger} from '../hooks/useUserLogger';
import {Link} from "react-router-dom";

export default function ProductList() {
  useUserLogger('ProductList');

  return (
    <div>
      <h1>Product List</h1>
      <img src="/predictpulse/assets/page2.jpg" alt="Product List"/>
      <nav>
        <Link to="/predictpulse/">Home</Link> |
        <Link to="/predictpulse/product-details">Product Details</Link> |
        <Link to="/predictpulse/about">About</Link> |
        <Link to="/predictpulse/contact">Contact</Link>
      </nav>
    </div>
  );
}
