import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Form, Spinner, Badge } from 'react-bootstrap';
import { ethers } from 'ethers';
import { 
  connectMetaMask, 
  getContract, 
  setupAccountListener,
  setupNetworkListener 
} from '../utils/ethereum';

// Contract ABIs - Make sure to import these
import DutchAuctionABI from '../contracts/DutchAuction.json';
import BidderABI from '../contracts/Bidder.json';

const DutchAuction = () => {
  // State structure remains the same but adds withdrawal-related states
  const [state, setState] = useState({
    auction: {
      status: 'CLOSED',
      currentPrice: '0',
      timeRemaining: 0,
      tokensAvailable: '0',
      totalFundsRaised: '0'
    },
    user: {
      account: '',
      bidderInfo: null
    },
    ui: {
      loading: false,
      error: '',
      success: '',
      bidAmount: '',
      lookupBidderId: ''
    }
  });

  const [contracts, setContracts] = useState({
    auction: null,
    bidder: null
  });

  const initializeContracts = async () => {
    setState(prev => ({ ...prev, ui: { ...prev.ui, loading: true, error: '' } }));
    
    try {
      const { signer, address } = await connectMetaMask();
      
      const auctionContract = getContract(
        process.env.REACT_APP_AUCTION_ADDRESS,
        DutchAuctionABI.abi,
        signer
      );

      const bidderContract = getContract(
        process.env.REACT_APP_BIDDER_ADDRESS,
        BidderABI.abi,
        signer
      );
      
      setContracts({ auction: auctionContract, bidder: bidderContract });
      setState(prev => ({
        ...prev,
        user: {
          ...prev.user,
          account: address
        }
      }));

      await updateAuctionInfo(auctionContract);
      await lookupBidderInfo(address, auctionContract, bidderContract);
      setupEventListeners(auctionContract);
      
    } catch (error) {
      setState(prev => ({
        ...prev,
        ui: { ...prev.ui, error: 'Failed to initialize: ' + error.message }
      }));
    } finally {
      setState(prev => ({ ...prev, ui: { ...prev.ui, loading: false } }));
    }
  };

  // Updated to use both contract calls correctly
  const lookupBidderInfo = async (address, auctionContract, bidderContract) => {
    const contractsToUse = {
      auction: auctionContract || contracts.auction,
      bidder: bidderContract || contracts.bidder
    };

    if (!contractsToUse.auction || !contractsToUse.bidder || !address) return;

    try {
      // First get bidder ID from auction contract
      const bidderId = await contractsToUse.auction.getBidderID(address).catch(() => null);
      
      if (bidderId !== null) {
        // Then get detailed info from bidder contract
        const info = await contractsToUse.bidder.getBidderInfo(bidderId);
        
        setState(prev => ({
          ...prev,
          user: {
            ...prev.user,
            bidderInfo: {
              id: bidderId.toString(),
              tokensPurchased: ethers.formatEther(info.tokensPurchased),
              tokensClaimed: info.tokenSent,
              bidValue: ethers.formatEther(info.bidValue),
              ethRefunded: info.ethRefunded,
              refundEth: ethers.formatEther(info.refundEth)
            }
          }
        }));
      }
    } catch (error) {
      console.error('Error fetching bidder info:', error);
    }
  };

  const updateAuctionInfo = async (auctionContract) => {
    const contractToUse = auctionContract || contracts.auction;
    if (!contractToUse) return;

    try {
      const [status, time, tokens, price, funds] = await Promise.all([
        contractToUse.getAuctionStatus(),
        contractToUse.getTimeRemaining(),
        contractToUse.getRemainingTokens(),
        contractToUse.getCurrentPrice(),
        contractToUse.getTotalFundsRaised()
      ]);

      setState(prev => ({
        ...prev,
        auction: {
          status: ['OPEN', 'PAUSED', 'CLOSED'][status] || 'UNKNOWN',
          currentPrice: ethers.formatEther(price),
          timeRemaining: Number(time),
          tokensAvailable: ethers.formatEther(tokens),
          totalFundsRaised: ethers.formatEther(funds)
        }
      }));

      // If time is up but status isn't closed, check auction end
      if (Number(time) <= 0 && status !== 2) {
        await contractToUse.checkAndEndAuction().catch(console.error);
      }
    } catch (error) {
      console.error('Error updating auction info:', error);
    }
  };

  const placeBid = async () => {
    if (!contracts.auction || !state.ui.bidAmount) return;
    
    setState(prev => ({ ...prev, ui: { ...prev.ui, loading: true, error: '' } }));
    
    try {
      const currentPrice = await contracts.auction.getCurrentPrice();
      
      const tx = await contracts.auction.placeBid({
        value: ethers.parseEther(state.ui.bidAmount),
        gasLimit: 300000
      });
      
      setState(prev => ({
        ...prev,
        ui: { ...prev.ui, success: 'Processing bid transaction...' }
      }));

      await tx.wait();
      
      // Wait a bit for bidder registration
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update all info
      await updateAuctionInfo();
      await lookupBidderInfo(state.user.account);
      
      setState(prev => ({
        ...prev,
        ui: { 
          ...prev.ui, 
          success: 'Bid placed successfully!',
          bidAmount: ''
        }
      }));
    } catch (error) {
      let errorMessage = 'Failed to place bid: ';
      
      if (error.code === 'INSUFFICIENT_FUNDS') {
        errorMessage += 'Insufficient funds in wallet';
      } else if (error.code === 'ACTION_REJECTED') {
        errorMessage += 'Transaction rejected';
      } else if (error.message.includes('Auction is not open')) {
        errorMessage += 'Auction is not currently open';
      } else if (error.message.includes('Bid below current price')) {
        errorMessage += 'Bid amount is below current price';
      } else {
        errorMessage += error.message;
      }

      setState(prev => ({
        ...prev,
        ui: { ...prev.ui, error: errorMessage }
      }));
    } finally {
      setState(prev => ({ ...prev, ui: { ...prev.ui, loading: false } }));
    }
  };

  const claimTokens = async () => {
    if (!contracts.auction || !state.user.bidderInfo) return;
    
    setState(prev => ({ ...prev, ui: { ...prev.ui, loading: true, error: '' } }));
    
    try {
      const tx = await contracts.auction.claimTokens(state.user.bidderInfo.id);
      
      setState(prev => ({
        ...prev,
        ui: { ...prev.ui, success: 'Processing claim transaction...' }
      }));

      await tx.wait();
      
      await lookupBidderInfo(state.user.account);
      
      setState(prev => ({
        ...prev,
        ui: { ...prev.ui, success: 'Tokens claimed successfully!' }
      }));
    } catch (error) {
      let errorMessage = 'Failed to claim tokens: ';
      
      if (error.message.includes('Auction is not closed')) {
        errorMessage += 'Auction must be closed before claiming tokens';
      } else if (error.message.includes('Tokens already claimed')) {
        errorMessage += 'Tokens have already been claimed';
      } else if (error.message.includes('Not the bidder')) {
        errorMessage += 'You are not the owner of this bid';
      } else {
        errorMessage += error.message;
      }

      setState(prev => ({
        ...prev,
        ui: { ...prev.ui, error: errorMessage }
      }));
    } finally {
      setState(prev => ({ ...prev, ui: { ...prev.ui, loading: false } }));
    }
  };

  // Event Listeners updated to match contract events
  const setupEventListeners = (contract) => {
    if (!contract) return;

    contract.on('BidPlaced', (bidder, bidAmount, tokensAllocated) => {
      console.log('New bid placed:', { bidder, bidAmount: ethers.formatEther(bidAmount), tokensAllocated });
      updateAuctionInfo();
      if (bidder.toLowerCase() === state.user.account.toLowerCase()) {
        lookupBidderInfo(state.user.account);
      }
    });

    contract.on('AuctionEnded', (totalFundsRaised, unsoldTokens) => {
      console.log('Auction ended:', { 
        totalFundsRaised: ethers.formatEther(totalFundsRaised),
        unsoldTokens: ethers.formatEther(unsoldTokens)
      });
      updateAuctionInfo();
    });

    contract.on('TokensClaimed', (bidderID, bidder, amount) => {
      console.log('Tokens claimed:', { 
        bidderID: bidderID.toString(),
        bidder,
        amount: ethers.formatEther(amount)
      });
      if (bidder.toLowerCase() === state.user.account.toLowerCase()) {
        lookupBidderInfo(state.user.account);
      }
    });

    return () => {
      contract.removeAllListeners();
    };
  };

  // Format Time Remaining
  const formatTimeRemaining = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Effect Hooks
  useEffect(() => {
    initializeContracts();
    return () => {
      if (contracts.auction) {
        contracts.auction.removeAllListeners();
      }
    };
  }, []);

  useEffect(() => {
    if (state.auction.timeRemaining > 0) {
      const timer = setInterval(() => {
        setState(prev => ({
          ...prev,
          auction: {
            ...prev.auction,
            timeRemaining: prev.auction.timeRemaining - 1
          }
        }));
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [state.auction.timeRemaining]);

  // Regular price updates
  useEffect(() => {
    if (state.auction.status === 'OPEN') {
      const interval = setInterval(() => {
        updateAuctionInfo();
      }, 30000); // Update every 30 seconds

      return () => clearInterval(interval);
    }
  }, [state.auction.status]);

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={10}>
          <Card className="shadow">
            <Card.Header className="bg-dark text-white d-flex justify-content-between align-items-center">
              <h3 className="mb-0">Dutch Auction</h3>
              <Badge bg={
                state.auction.status === 'OPEN' ? 'success' : 
                state.auction.status === 'PAUSED' ? 'warning' : 'secondary'
              }>
                {state.auction.status}
              </Badge>
            </Card.Header>
            
            <Card.Body>
              {/* Connected Account */}
              <div className="mb-4">
                <h5>Connected Account</h5>
                <code>{state.user.account || 'Not connected'}</code>
              </div>

              {/* Auction Status Cards */}
              <Row className="mb-4">
                <Col md={3}>
                  <Card className="h-100">
                    <Card.Body className="text-center">
                      <Card.Title>Current Price</Card.Title>
                      <h4>{Number(state.auction.currentPrice).toFixed(4)} ETH</h4>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="h-100">
                    <Card.Body className="text-center">
                      <Card.Title>Time Remaining</Card.Title>
                      <h4>{formatTimeRemaining(state.auction.timeRemaining)}</h4>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="h-100">
                    <Card.Body className="text-center">
                      <Card.Title>Available Tokens</Card.Title>
                      <h4>{Number(state.auction.tokensAvailable).toFixed(2)}</h4>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="h-100">
                    <Card.Body className="text-center">
                      <Card.Title>Funds Raised</Card.Title>
                      <h4>{Number(state.auction.totalFundsRaised).toFixed(4)} ETH</h4>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {/* Bidder Information */}
              {state.user.bidderInfo && (
                <Card className="mb-4">
                  <Card.Header>Your Bid Information</Card.Header>
                  <Card.Body>
                    <Row>
                      <Col md={6}>
                        <p><strong>Bidder ID:</strong> {state.user.bidderInfo.id}</p>
                        <p><strong>Bid Amount:</strong> {Number(state.user.bidderInfo.bidValue).toFixed(4)} ETH</p>
                      </Col>
                      <Col md={6}>
                        <p><strong>Tokens Purchased:</strong> {Number(state.user.bidderInfo.tokensPurchased).toFixed(2)}</p>
                        <p><strong>Tokens Claimed:</strong> {state.user.bidderInfo.tokensClaimed ? 'Yes' : 'No'}</p>
                      </Col>
                    </Row>
                    {!state.user.bidderInfo.tokensClaimed && state.auction.status === 'CLOSED' && (
                      <Button 
                        variant="success" 
                        onClick={claimTokens}
                        disabled={state.ui.loading}
                      >
                        {state.ui.loading ? (
                          <>
                            <Spinner size="sm" className="me-2" />
                            Claiming...
                          </>
                        ) : 'Claim Tokens'}
                      </Button>
                    )}
                  </Card.Body>
                </Card>
              )}

              {/* Bid Form */}
              {state.auction.status === 'OPEN' && (
                <Card className="mb-4">
                  <Card.Header>Place Bid</Card.Header>
                  <Card.Body>
                    <Form onSubmit={(e) => { e.preventDefault(); placeBid(); }}>
                      <Form.Group className="mb-3">
                        <Form.Label>Bid Amount (ETH)</Form.Label>
                        <Form.Control
                          type="number"
                          step="0.01"
                          value={state.ui.bidAmount}
                          onChange={(e) => setState(prev => ({
                            ...prev,
                            ui: { ...prev.ui, bidAmount: e.target.value }
                          }))}
                          placeholder="Enter bid amount"
                          disabled={state.ui.loading}
                        />
                      </Form.Group>
                      <Button 
                        variant="primary" 
                        type="submit"
                        disabled={state.ui.loading || !state.ui.bidAmount}
                      >
                        {state.ui.loading ? (
                          <>
                            <Spinner size="sm" className="me-2" />
                            Processing...
                          </>
                        ) : 'Place Bid'}
                      </Button>
                    </Form>
                  </Card.Body>
                </Card>
              )}

              {/* Alerts */}
              {state.ui.error && (
                <Alert variant="danger" dismissible onClose={() => setState(prev => ({ ...prev, ui: { ...prev.ui, error: '' } }))}>
                  {state.ui.error}
                </Alert>
              )}
              {state.ui.success && (
                <Alert variant="success" dismissible onClose={() => setState(prev => ({ ...prev, ui: { ...prev.ui, success: '' } }))}>
                  {state.ui.success}
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default DutchAuction;