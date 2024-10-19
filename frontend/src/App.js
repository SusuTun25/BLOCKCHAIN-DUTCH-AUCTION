import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuctionProvider } from '../src/components/AuctionContext';
import Header from './components/Header';
import Home from './pages/Home';
import Auction from './pages/Auction';
import CreateAuction from './pages/CreateAuction'

function App() {
  return (
    <AuctionProvider>
       <Router>
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/createauction" element={<CreateAuction />} />
          <Route path="/auction" element={<Auction />} />
        </Routes>
      </Router>
    </AuctionProvider>
   
  );
}

export default App;