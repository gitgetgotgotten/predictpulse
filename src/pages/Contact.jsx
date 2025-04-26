import {useUserLogger} from '../hooks/useUserLogger';
import {useSmartPreload} from '../hooks/useSmartPreload';
import {Link} from "react-router-dom";

export default function Contact() {
  useUserLogger('Contact');
  useSmartPreload('Contact');

  return (
    <div>
      <h1>Contact</h1>
      <img src="/predictpulse/assets/page5.jpg" alt="Contact"/>
      <nav>
        <Link to="/">Home</Link> |
        <Link to="/product-list">Product List</Link> |
        <Link to="/product-details">Product Details</Link> |
        <Link to="/about">About</Link>
      </nav>
    </div>
  );
}
