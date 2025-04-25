import {BrowserRouter, Routes, Route} from 'react-router-dom';
import ConsentPopup from './components/ConsentPopup.jsx';
import DownloadLogs from './components/DownloadLogs.jsx';
import Simulation from './components/Simulation.jsx';
import Home from './pages/Home';
import ProductList from './pages/ProductList';
import ProductDetails from './pages/ProductDetails';
import About from './pages/About';
import Contact from './pages/Contact';

function ExitPage() {
  return <h1>Thank you for your choice. You can close this tab.</h1>;
}

export default function App() {
  return (
    <BrowserRouter>
      <ConsentPopup/>
      <DownloadLogs/>
      <Simulation/>
      <Routes>
        <Route path="/" element={<Home/>}/>
        <Route path="/product-list" element={<ProductList/>}/>
        <Route path="/product-details" element={<ProductDetails/>}/>
        <Route path="/about" element={<About/>}/>
        <Route path="/contact" element={<Contact/>}/>
        <Route path="/exit" element={<ExitPage/>}/>
      </Routes>
    </BrowserRouter>
  );
}
