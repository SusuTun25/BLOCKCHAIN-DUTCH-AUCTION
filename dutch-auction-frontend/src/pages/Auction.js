import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert } from 'react-bootstrap';
import { connectMetaMask, getContract, listenForAccountChanges, listenForNetworkChanges } from '../utils/ethereum';
import { ethers } from 'ethers';
import DutchAuctionABI from '../contracts/DutchAuction.json'; 

const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;

const Auction = () => {
  const [currentPrice, setCurrentPrice] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const testDirectCall = async (provider, address) => {
    const abi = ["function retrieveCurrentPrice() view returns (int256)"];
    const contract = new ethers.Contract(address, abi, provider);
    try {
      const result = await contract.retrieveCurrentPrice();
      console.log("Direct call result:", result.toString());
    } catch (error) {
      console.error("Direct call error:", error);
    }
  };

  const checkOwner = async (auctionContract) => {
    try {
      const owner = await auctionContract.getOwner();
      console.log("Contract owner:", owner);
      return owner;
    } catch (error) {
      console.error("Error fetching owner:", error);
      setError("Failed to fetch contract owner: " + error.message);
      return null;
    }
  };

  useEffect(() => {
    const init = async () => {
      if (typeof window.ethereum === 'undefined') {
        setError("MetaMask is not installed. Please install it to participate in the auction.");
        return;
      }

      try {
        const network = await window.ethereum.request({ method: 'eth_chainId' });
        console.log("Connected to network:", network);
        console.log("Contract address:", CONTRACT_ADDRESS);

        const provider = new ethers.BrowserProvider(window.ethereum);
        const code = await provider.getCode(CONTRACT_ADDRESS);
        if (code === '0x') {
          console.error("No contract found at the specified address");
          setError("Contract not found at the specified address");
          return;
        }

        await testDirectCall(provider, CONTRACT_ADDRESS);

        const result = await connectMetaMask();
        if (result && result.signer && result.address) {
          setAccount(result.address);
          console.log("Connected to account:", result.address);
          console.log("ABI:", JSON.stringify(DutchAuctionABI.abi));
          const auctionContract = getContract(CONTRACT_ADDRESS, DutchAuctionABI.abi, result.signer);
          console.log("Auction Contract:", auctionContract);
          setContract(auctionContract);
          
          await updateAuctionInfo(auctionContract);
        } else {
          setError("Failed to connect to MetaMask. Please make sure it's installed and unlocked.");
        }
      } catch (err) {
        console.error("Error in init:", err);
        setError("An error occurred while initializing the auction: " + err.message);
      }
    };

    init();

    listenForAccountChanges((newAccount) => {
      if (newAccount) {
        setAccount(newAccount);
        init();
      } else {
        setAccount(null);
      }
    });

    listenForNetworkChanges(() => {
      init();
    });

    const intervalId = setInterval(() => {
      if (contract) {
        updateAuctionInfo(contract);
      }
    }, 10000);

    return () => clearInterval(intervalId);
  }, []);

  const updateAuctionInfo = async (auctionContract) => {
    try {
      console.log("Updating auction info...");
  
      console.log("Calling retrieveCurrentPrice...");
      const price = await auctionContract.retrieveCurrentPrice();
      console.log("Retrieved Price (BigInt):", price.toString());
      
      // Convert BigInt to string, then to ether
      const priceInEther = ethers.formatEther(price.toString());
      console.log("Price in Ether:", priceInEther);
      setCurrentPrice(priceInEther);
  
      console.log("Calling retrieveTimeElapsed...");
      const timeElapsed = await auctionContract.retrieveTimeElapsed();
      console.log("Time Elapsed:", timeElapsed.toString());
      setTimeLeft(Math.max(0, 1200 - Number(timeElapsed) * 60));
    } catch (error) {
      console.error('Error updating auction info:', error);
      setError("Failed to update auction information: " + error.message);
    }
  };

  const placeBid = async () => {
    if (contract && account) {
      setIsLoading(true);
      try {
        console.log("Current price:", currentPrice);
        const bidValueInWei = ethers.parseEther(currentPrice);
        console.log("Bid value in Wei:", bidValueInWei.toString());
  
        // Check auction state before bidding
        const auctionState = await contract.getAuctionState();
        console.log("Auction state:", auctionState);
  
        // Get the current contract price for comparison
        const contractPrice = await contract.retrieveCurrentPrice();
        console.log("Contract current price:", ethers.formatEther(contractPrice));
  
        // Estimate gas to check if the transaction will fail
        const estimatedGas = await contract.addBidder.estimateGas({ value: bidValueInWei });
        console.log("Estimated gas:", estimatedGas.toString());
  
        // If we get here, the transaction should be valid
        const tx = await contract.addBidder({ value: bidValueInWei });
        console.log("Transaction sent:", tx.hash);
        await tx.wait();
        console.log("Transaction confirmed");
        alert('Bid placed successfully!');
        await updateAuctionInfo(contract);
      } catch (error) {
        console.error('Detailed error:', error);
        if (error.code === 4001) {
          setError("Transaction rejected by the user.");
        } else if (error.reason) {
          setError("Contract error: " + error.reason);
        } else {
          setError("Failed to place bid: " + error.message);
        }
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