import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { ethers } from 'ethers';
import { Container, Row, Col, Card, Button, Alert } from 'react-bootstrap';
import { convertUnixTimeToMinutes, listenForAccountChanges, listenForNetworkChanges } from '../utils/ethereum';
import DutchAuction from '../abis/DutchAuction.json'; // Make sure this path is correct
import token from '../abis/Token.json'
import { useAuctionContext } from '../components/AuctionContext';

const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;

const Auction = () => {
  const { auctionAddress, tokenAdd} = useAuctionContext();
  const [currentPrice, setCurrentPrice] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const currentTime = Math.floor(Date.now() / 1000);
  const [count, setCount] = useState(0);
  const [auction, setAuction] = useState({
    tokenAdd: '',
    tokenName: '',
    tokenTicker: '',
    sellerAdd: '',
    startedOn: 'NaN',
    tokenQty: '',
    startingPrice: '',
    reservePrice: 'NaN',
    currentPrice: 'NaN',
    placeBidTimeRemaining: 'NaN',
    revealAtTimeRemaining: 'NaN',
    status: 0,
  });

  const testaddress = '0xcf170D09600BAC7cea8a2AA369281f1970a44ACF'

  useEffect(() => {
    async function getAuctionInfo() {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const dutchAuctionContract = new ethers.Contract(testaddress, DutchAuction.abi, signer);
        console.log(testaddress);
        // Token info
        const tokenAdd = await dutchAuctionContract.token();
        const tokenContract = new ethers.Contract(tokenAdd, token.abi, signer);
        console.log(tokenAdd);
        const tokenName = await tokenContract.name();
        const tokenTicker = await tokenContract.symbol();

        // Auction info
        const seller = await dutchAuctionContract.seller();
        const tokenQty = await dutchAuctionContract.tokenQty();
        const startingPrice = await dutchAuctionContract.startingPrice();  
        console.log(startingPrice);
        const reservePrice = await dutchAuctionContract.getReservePrice();

        const auctionStatus = await dutchAuctionContract.auctionStatusPred(currentTime);
        const newAuction = {
          ...auction,
          tokenAdd: tokenAdd,
          tokenName: tokenName,
          tokenTicker: tokenTicker,
          sellerAdd: seller,
          tokenQty: tokenQty,
          startingPrice: startingPrice,
          reservePrice: reservePrice,
          status: auctionStatus,
        };

        if (auctionStatus !== 0) {
          const startAt = parseInt((await dutchAuctionContract.startAt())._hex);
          const startedOn = new Date(startAt * 1000).toLocaleString();
          newAuction.startedOn = startedOn;
        }

        if (auctionStatus === 1) {
          const revealAt = parseInt((await dutchAuctionContract.revealAt())._hex);
          const placeBidTimeRemaining = Math.max(revealAt - currentTime, 0);
          newAuction.placeBidTimeRemaining = convertUnixTimeToMinutes(placeBidTimeRemaining);

          const currentPrice = await dutchAuctionContract.getPrice(currentTime);
          newAuction.currentPrice = currentPrice;
        }

        if (auctionStatus === 2) {
          newAuction.currentPrice = reservePrice;
          newAuction.placeBidTimeRemaining = convertUnixTimeToMinutes(0);
          const endAt = parseInt((await dutchAuctionContract.endAt())._hex);
          const revealAtTimeRemaining = Math.max(endAt - currentTime, 0);
          newAuction.revealAtTimeRemaining = convertUnixTimeToMinutes(revealAtTimeRemaining);
        }

        if (auctionStatus === 3) {
          newAuction.revealAtTimeRemaining = convertUnixTimeToMinutes(0);
        }

        setAuction(newAuction);
      } catch (error){
        console.log(error)
      }
    };

    // Set up interval to update auction info
    setInterval(() => {
      setCount(count + 1);
    }, 100000000);
    getAuctionInfo();

  }, []);

  async function startAuction() {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const dutchAuctionContract = new ethers.Contract(auctionAddress, DutchAuction.abi, signer);
    setLoading(true);
    const startAucTx = await dutchAuctionContract.startAuction();
    await startAucTx.wait();
    setLoading(false);
    window.location.reload();
  }

  // const [bidAmount, setBidAmount] = useState();
  // async function placeBid() {
  //   const submarineAddresss = await createSubmarineContract(auction.currentPrice);
  //   console.log(submarineAddresss);
  //   dispatch(accountBidded(currentAccountAddress, auctionAddress, submarineAddresss));
  //   await sendEthertoSubmarine(submarineAddresss, bidAmount);
  //   const submarineBalance = await getSubmarineBalance(submarineAddresss);
  //   console.log(submarineBalance);
  // }

  return (
    <Container className="mt-5">
      <Row className="justify-content-md-center">
        <Col md={8}>
          {error && (
            <Alert variant="danger" className="mb-4">
              {error}
            </Alert>
          )}
          <Card className="text-center mb-4">
            <Card.Body>
              <Card.Title>Current Price</Card.Title>
              <Card.Text className="display-4">{auction.startingPrice} </Card.Text>
            </Card.Body>
          </Card>
          
          <Card className="text-center mb-4">
            <Card.Body>
              <Card.Title>Time Remaining</Card.Title>
              <Card.Text className="display-4">
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </Card.Text>
            </Card.Body>
          </Card>
          
          <div className="d-grid gap-2">
            <Button 
              variant="primary" 
              size="lg" 
              // onClick={placeBid}
              disabled={!account || timeLeft === 0 || isLoading}
            >
              {isLoading ? 'Processing...' : 'Place Bid'}
            </Button>
          </div>

          {!account && (
            <Alert variant="warning" className="mt-4">
              Please connect your MetaMask wallet to participate in the auction.
            </Alert>
          )}

          {account && (
            <Alert variant="info" className="mt-4">
              Connected Account: {account}
            </Alert>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default Auction;