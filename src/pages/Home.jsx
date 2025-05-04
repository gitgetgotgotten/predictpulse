import {useUserLogger} from '../hooks/useUserLogger';
import {Link} from "react-router-dom";

export default function Home() {
  useUserLogger('Home');

  return (
    <div>
      <h1>Home</h1>
      <img src="/predictpulse/assets/page1.jpg" alt="Home"/>
      <nav>
        <Link to="/predictpulse/product-list">Product List</Link> |
        <Link to="/predictpulse/product-details">Product Details</Link> |
        <Link to="/predictpulse/about">About</Link> |
        <Link to="/predictpulse/contact">Contact</Link>
      </nav>
    </div>
  );
}
