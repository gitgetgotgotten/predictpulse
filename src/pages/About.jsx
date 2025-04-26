import {useUserLogger} from '../hooks/useUserLogger';
import {useSmartPreload} from '../hooks/useSmartPreload';
import {Link} from "react-router-dom";

export default function About() {
  useUserLogger('About');
  useSmartPreload('About');

  return (
    <div>
      <h1>About</h1>
      <img src="/predictpulse/assets/page4.jpg" alt="About"/>
      <nav>
        <Link to="/">Home</Link> |
        <Link to="/product-list">Product List</Link> |
        <Link to="/product-details">Product Details</Link> |
        <Link to="/contact">Contact</Link>
      </nav>
    </div>
  );
}
