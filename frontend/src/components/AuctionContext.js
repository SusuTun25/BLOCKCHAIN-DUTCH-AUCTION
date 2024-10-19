// AuctionContext.js
import React, { createContext, useContext } from 'react';
import useAuction from '../utils/useAuction';

const AuctionContext = createContext();

export const AuctionProvider = ({ children }) => {
    const auction = useAuction(); // Use the custom hook here

    return (
        <AuctionContext.Provider value={auction}>
            {children}
        </AuctionContext.Provider>
    );
};

export const useAuctionContext = () => useContext(AuctionContext);
