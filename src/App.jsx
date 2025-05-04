import {useEffect} from 'react';
import {BrowserRouter, Routes, Route, useLocation} from 'react-router-dom';
import {predictAssets} from './utils/predictAssets';
import ConsentPopup from './components/ConsentPopup.jsx';
import DownloadLogs from './components/DownloadLogs.jsx';
import Home from './pages/Home';
import ProductList from './pages/ProductList';
import ProductDetails from './pages/ProductDetails';
import About from './pages/About';
import Contact from './pages/Contact';

function ExitPage() {
  return <h1>Thank you for your choice. You can close this tab.</h1>;
}

function PreloadManager() {
  const location = useLocation();
  const pageMap = {
    '/predictpulse/': 'Home',
    '/predictpulse/product-list': 'ProductList',
    '/predictpulse/product-details': 'ProductDetails',
    '/predictpulse/about': 'About',
    '/predictpulse/contact': 'Contact',
    '/predictpulse/exit': 'Exit'
  };
  const currentPage = pageMap[location.pathname] || 'Home';

  useEffect(() => {
    const assets = predictAssets(currentPage);
    assets.forEach(asset => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = asset.url;
      link.as = asset.as;
      link.fetchpriority = asset.type === 'script' ? 'high' : 'low';
      document.head.appendChild(link);
    });
    // Reset flag on page change
    return () => {
      window.__predictAssetsRun = false;
    };
  }, [currentPage]); // Run when currentPage changes

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <PreloadManager/>
      <ConsentPopup/>
      <DownloadLogs/>
      <Routes>
        <Route path="/predictpulse/" element={<Home/>}/>
        <Route path="/predictpulse/product-list" element={<ProductList/>}/>
        <Route path="/predictpulse/product-details" element={<ProductDetails/>}/>
        <Route path="/predictpulse/about" element={<About/>}/>
        <Route path="/predictpulse/contact" element={<Contact/>}/>
        <Route path="/predictpulse/exit" element={<ExitPage/>}/>
      </Routes>
    </BrowserRouter>
  );
}