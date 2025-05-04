import {useUserLogger} from '../hooks/useUserLogger';
import {Link} from "react-router-dom";

export default function Contact() {
  useUserLogger('Contact');

  return (
    <div>
      <h1>Contact</h1>
      <img src="/predictpulse/assets/page5.jpg" alt="Contact"/>
      <nav>
        <Link to="/predictpulse/">Home</Link> |
        <Link to="/predictpulse/product-list">Product List</Link> |
        <Link to="/predictpulse/product-details">Product Details</Link> |
        <Link to="/predictpulse/about">About</Link>
      </nav>
    </div>
  );
}
