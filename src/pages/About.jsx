import {useUserLogger} from '../hooks/useUserLogger';
import {Link} from "react-router-dom";

export default function About() {
  useUserLogger('About');

  return (
    <div>
      <h1>About</h1>
      <img src="/predictpulse/assets/page4.jpg" alt="About"/>
      <nav>
        <Link to="/predictpulse/">Home</Link> |
        <Link to="/predictpulse/product-list">Product List</Link> |
        <Link to="/predictpulse/product-details">Product Details</Link> |
        <Link to="/predictpulse/contact">Contact</Link>
      </nav>
    </div>
  );
}
