import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Die stylgids word EERSTE gelaai, sodat elke komponent se eie
// lêer die veranderlikes kan gebruik wat dit definieer.
import './styles/tokens.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
