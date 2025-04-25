import {useUserLogger} from '../hooks/useUserLogger';
import {useSmartPreload} from '../hooks/useSmartPreload';
import {Link} from "react-router-dom";

export default function Home() {
  useUserLogger('Home');
  useSmartPreload('Home');

  return (
    <div>
      <h1>Home</h1>
      <img src="/assets/page1.jpg" alt="Home"/>
      <nav>
        <Link to="/product-list">Product List</Link> |
        <Link to="/product-details">Product Details</Link> |
        <Link to="/about">About</Link> |
        <Link to="/contact">Contact</Link>
      </nav>
    </div>
  );
}
