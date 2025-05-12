import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { predictAssets } from './utils/predictAssets';
import ConsentPopup from './components/ConsentPopup.jsx';
import DownloadLogs from './components/DownloadLogs.jsx';
import Home from './pages/Home';
import ProductList from './pages/ProductList';
import ProductDetails from './pages/ProductDetails';
import About from './pages/About';
import Contact from './pages/Contact';

const routes = [
  { path: '/predictpulse/', component: Home, name: 'Home' },
  { path: '/predictpulse/product-list', component: ProductList, name: 'ProductList' },
  { path: '/predictpulse/product-details', component: ProductDetails, name: 'ProductDetails' },
  { path: '/predictpulse/about', component: About, name: 'About' },
  { path: '/predictpulse/contact', component: Contact, name: 'Contact' },
  { path: '/predictpulse/exit', component: () => <h1>Thank you. Close this tab.</h1>, name: 'Exit' },
];

function PreloadManager() {
  const location = useLocation();
  const currentRoute = routes.find(r => r.path === location.pathname) || routes[0];

  useEffect(() => {
    try {
      const assets = predictAssets(currentRoute.name);
      assets.forEach(asset => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = asset.url;
        link.as = asset.as;
        link.fetchpriority = asset.type === 'script' ? 'high' : 'low';
        link.onerror = () => console.warn(`Preload failed for ${asset.url}`);
        document.head.appendChild(link);
      });
    } catch (error) {
      console.error('Preload error:', error);
    }
  }, [currentRoute.name]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <PreloadManager />
      <ConsentPopup />
      <DownloadLogs />
      <Routes>
        {routes.map(({ path, component: Component }) => (
          <Route key={path} path={path} element={<Component />} />
        ))}
      </Routes>
    </BrowserRouter>
  );
}