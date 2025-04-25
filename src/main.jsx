import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// Disable React Strict Mode to prevent double renders
createRoot(document.getElementById('root')).render(<App />);
