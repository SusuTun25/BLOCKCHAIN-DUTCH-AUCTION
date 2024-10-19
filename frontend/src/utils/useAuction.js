// useAuction.js
import { useState } from 'react';

const useAuction = () => {
    const [auctionAddress, setAuctionAddress] = useState(null);
    const [auctionDetails, setAuctionDetails] = useState(null);
    const [tokenAdd, setTokenAdd] = useState(null);

    return {
        auctionAddress,
        setAuctionAddress,
        auctionDetails,
        setAuctionDetails,
        tokenAdd,
        setTokenAdd
    };
};

export default useAuction;