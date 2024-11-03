import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert } from 'react-bootstrap';
import { connectMetaMask, getContract, listenForAccountChanges, listenForNetworkChanges } from '../utils/ethereum';
import { ethers } from 'ethers';
import DutchAuctionABI from '../contracts/DutchAuction.json'; // Make sure this path is correct/
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;

const Auction = () => {
  const [currentPrice, setCurrentPrice] = useState(0);
  const [currentToken, setCurrentToken] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuctionEnded, setIsAuctionEnded] = useState(false);

  useEffect(() => {
    const initContract = async () => {
      try {
        const result = await connectMetaMask();
        if (result && result.signer && result.address) {
          setAccount(result.address);
          const auctionContract = getContract(
            CONTRACT_ADDRESS,
            DutchAuctionABI.abi,
            result.signer
          );
          setContract(auctionContract); // Set contract only once
          await updateAuctionInfo(auctionContract); // Load auction info once on load
        } else {
          setError("Failed to connect to MetaMask. Please make sure it's installed and unlocked.");
        }
      } catch (err) {
        console.error("Error in initContract:", err);
        setError("An error occurred while initializing the auction.");
      }
    };
  
    initContract(); // Initialize contract only once
  
    // Set up listeners for account and network changes
    window.ethereum?.on("accountsChanged", handleAccountChange);
    window.ethereum?.on("chainChanged", handleNetworkChange);
  
    // Clean up listeners on component unmount
    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountChange);
      window.ethereum?.removeListener("chainChanged", handleNetworkChange);
    };
  }, []); // Empty dependency array to run only once
  
  const handleAccountChange = (newAccount) => {
    if (newAccount.length > 0) {
      setAccount(newAccount[0]);
      // Call only account-specific updates if needed
    } else {
      setAccount(null);
    }
  };
  
  const handleNetworkChange = () => {
    // If a network change requires re-initialization, handle it here
    setError("Network has changed. Please reconnect or reload if necessary.");
  };
  
  const updateAuctionInfo = async (auctionContract) => {
    try {
      if (isAuctionEnded) {
        console.log("Auction has ended. Skipping update.");
        return;
      }
  
      const timeRemaining = await auctionContract.getTimeRemaining();
      setTimeLeft(parseInt(timeRemaining.toString(), 10));
      setIsAuctionEnded(timeRemaining <= 0);
  
      const token = await auctionContract.getRemainingTokens();
      setCurrentToken(ethers.formatUnits(token, 18));
  
      if (!isAuctionEnded) {
        const price = await auctionContract.getCurrentPrice();
        setCurrentPrice(ethers.formatEther(price));
      }
    } catch (error) {
      console.error("Error updating auction info:", error);
      setError("Failed to update auction information.");
    }
  };
  
  const placeBid = async () => {
    if (contract && account && !isAuctionEnded) {
      setIsLoading(true);
      try {
        const tx = await contract.placeBid({ value: ethers.parseEther(currentPrice) });
        await tx.wait();
        alert("Bid placed successfully!");
        await updateAuctionInfo(contract); // Refresh auction info after placing bid
      } catch (error) {
        if (error.code === -32603 || error.message.includes("revert")) {
          console.error("Error placing bid: Contract has ended.");
          setError("The auction has ended. Bids are no longer accepted.");
        } else {
          console.error("Error placing bid:", error);
          setError("Failed to place bid. Please try again.");
        }
      } finally {
        setIsLoading(false);
      }
    }
  };
  

  // const updateAuctionInfo = async (auctionContract) => {
  //   try {

  //     if (isAuctionEnded) {
  //       await endAuction();
  //       console.log("Auction has ended. Skipping update.");
  //       return;
  //     }

  //     const timeRemaining = await auctionContract.getTimeRemaining();
  //     console.log(timeRemaining)
  //     setTimeLeft(parseInt(timeRemaining.toString(), 10));
  //     setIsAuctionEnded(timeRemaining <= 0)

  //     const token = await auctionContract.getRemainingTokens();
  //     console.log(token)
  //     setcurrentToken(ethers.formatUnits(token, 18))

  //     if (!isAuctionEnded) {
  //       const price = await auctionContract.getCurrentPrice();
  //       setCurrentPrice(ethers.formatEther(price));
  //     }
      
  //     console.log(timeRemaining)
  //   } catch (error) {
  //     console.error("Error updating auction info:", error);
  //     setError("Failed to update auction information.");
  //   }
  // };

  // const placeBid = async () => {
  //   if (contract && account && !isAuctionEnded) {
  //     setIsLoading(true);
  //     try {
  //       const tx = await contract.placeBid({ value: ethers.parseEther(currentPrice) });
  //       await tx.wait();
  //       alert("Bid placed successfully!");
  //       await updateAuctionInfo(contract);
  //     } catch (error) {
  //       if (error.code === -32603 || error.message.includes("revert")) {
  //         console.error("Error placing bid: Contract has ended.");
  //         setError("The auction has ended. Bids are no longer accepted.");
  //       } else {
  //         console.error("Error placing bid:", error);
  //         setError("Failed to place bid. Please try again.");
  //       }
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   }
  // };

  // useEffect(() => {
  //   const init = async () => {
  //     try {
  //       const result = await connectMetaMask();
  //       if (result && result.signer && result.address) {
  //         setAccount(result.address);
  //         const auctionContract = getContract(
  //           CONTRACT_ADDRESS,
  //           DutchAuctionABI.abi,
  //           result.signer
  //         );
  //         setContract(auctionContract);
  //         await updateAuctionInfo(auctionContract);
  //       } else {
  //         setError("Failed to connect to MetaMask. Please make sure it's installed and unlocked.");
  //       }
  //     } catch (err) {
  //       console.error("Error in init:", err);
  //       setError("An error occurred while initializing the auction.");
  //     }
  //   };

  //   init();

  //   listenForAccountChanges((newAccount) => {
  //     if (newAccount.length > 0) {
  //       setAccount(newAccount[0]);
  //       init(); // Reinitialize with new account
  //     } else {
  //       setAccount(null);
  //     }
  //   });

  //   listenForNetworkChanges(() => {
  //     init(); // Reinitialize on network change
  //   });

  //   // Set up listeners
  //   window.ethereum?.on("accountsChanged", listenForAccountChanges);
  //   window.ethereum?.on("chainChanged", listenForNetworkChanges);

  //   // Clean up interval on component unmount
  //   return () => {
  //     window.ethereum?.removeListener("accountsChanged", listenForAccountChanges);
  //     window.ethereum?.removeListener("chainChanged", listenForNetworkChanges);
  //   }
  // }, []);

  // Local countdown effect for smooth timer decrement
  useEffect(() => {
    if (timeLeft > 0) {
      const countdownIntervalId = setInterval(() => {
        setTimeLeft((prevTimeLeft) => {
          if (prevTimeLeft <= 1) {
            clearInterval(countdownIntervalId); // Clear interval when timeLeft is 0
            setIsAuctionEnded(true);
            return 0;
          }
          return prevTimeLeft - 1;
        });
      }, 1000); // Decrement every second

      return () => clearInterval(countdownIntervalId);
    }
  }, [timeLeft]);

  const endAuction = async () => {
    try {
      const tx = await contract.checkAndEndAuction();
      await tx.wait();
      const state = await contract.getAuctionStatus();
      console.log(state);
      alert("Auction ended successfully!");
    } catch (error) {
      console.error("Error ending auction:", error.message || error);
      alert("Failed to end the auction.");
    }
  };

  useEffect(() => {
    if (contract) {
      const handleDebugEvent = (message, value) => {
        console.log(`Debug Event - ${message}: ${value.toString()}`);
      };
  
      contract.on("Debug", handleDebugEvent);
  
      // Clean up the event listener when component unmounts
      return () => {
        contract.off("Debug", handleDebugEvent);
      };
    }
  }, [contract]); // Run this only once when the contract is set
  

  const claimTokens = async (bidderID) => {
    if (contract && account) {
      try {
        updateAuctionInfo();
        const state = await contract.getAuctionStatus();
        console.log(state);
        const tx = await contract.claimTokens(bidderID);
        await tx.wait();
        alert("Tokens claimed successfully!");
        
        // Log only essential information
        console.log("Transaction Hash:", tx.hash);
      } catch (error) {
        console.error("Error claiming tokens:", error.message || error); // Log only the message, not the full object
        alert("Failed to claim tokens.");
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

          <Card className="text-center mb-4">
            <Card.Body>
              <Card.Title>Coin Available</Card.Title>
              <Card.Text className="display-4">{currentToken}</Card.Text>
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

          <div>

          </div>

          <div className="d-grid gap-2">
            <Button 
              variant="primary" 
              size="lg" 
              onClick={claimTokens}
              disabled={!account || timeLeft > 0}
            >
              {isLoading ? 'Claiming...' : 'Claim Bid'}
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