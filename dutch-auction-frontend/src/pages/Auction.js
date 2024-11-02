import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert } from 'react-bootstrap';
import { connectMetaMask, getContract, listenForAccountChanges, listenForNetworkChanges } from '../utils/ethereum';
import { ethers } from 'ethers';
import DutchAuctionABI from '../contracts/DutchAuction.json'; // Make sure this path is correct/
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;

const Auction = () => {
  const [currentPrice, setCurrentPrice] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const result = await connectMetaMask();
        if (result && result.signer && result.address) {
          setAccount(result.address);
          const auctionContract = getContract(CONTRACT_ADDRESS, DutchAuctionABI.abi, result.signer);
          setContract(auctionContract);
          await updateAuctionInfo(auctionContract);
        } else {
          setError("Failed to connect to MetaMask. Please make sure it's installed and unlocked.");
        }
      } catch (err) {
        console.error("Error in init:", err);
        setError("An error occurred while initializing the auction.");
      }
    };
    init();

    listenForAccountChanges((newAccount) => {
      setAccount(newAccount);
      init(); // Reinitialize with new account
    });

    listenForNetworkChanges(() => {
      init(); // Reinitialize on network change
    });

    // Set up interval to update auction info
    const intervalId = setInterval(() => {
      if (contract) {
        updateAuctionInfo(contract);
      }
    }, 10000); // Update every 10 seconds

    return () => clearInterval(intervalId);
  }, []);

  const updateAuctionInfo = async (auctionContract) => {
    try {
      const price = await auctionContract.getCurrentPrice();
      setCurrentPrice(ethers.formatEther(price));
      
      const timeElapsed = await auctionContract.getTimeRemaining();
      setTimeLeft(parseInt(timeElapsed.toString(), 10));
    } catch (error) {
      console.error('Error updating auction info:', error);
      setError("Failed to update auction information.");
    }
  };

  const placeBid = async () => {
    if (contract && account) {
      setIsLoading(true);
      try {
        const tx = await contract.placeBid({ value: ethers.parseEther(currentPrice) });
        await tx.wait();
        alert('Bid placed successfully!');
        await updateAuctionInfo(contract);
      } catch (error) {
        console.error('Error placing bid:', error);
        setError("Failed to place bid. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
  };

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
              <Card.Text className="display-4">{currentPrice} ETH</Card.Text>
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
              onClick={placeBid}
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