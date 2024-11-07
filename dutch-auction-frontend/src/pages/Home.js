import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Alert, Card, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { connectMetaMask, switchAccount, setupAccountListener, verifyNetwork, switchNetwork } from '../utils/ethereum';

const Home = () => {
  // State Management
  const [userState, setUserState] = useState({
    account: null,
    networkName: null,
    isCorrectNetwork: false
  });

  const [uiState, setUiState] = useState({
    isLoading: false,
    error: null,
    setupStatus: ''
  });

  const resetLocalNetwork = async () => {
    setUiState(prev => ({ 
      ...prev, 
      isLoading: true, 
      setupStatus: 'Resetting local network...' 
    }));

    try {
      // First remove existing network
      await window.ethereum.request({
        method: 'wallet_deleteNetwork',
        params: [{ chainId: '0x7A69' }] // 31337 in hex
      }).catch(() => {
        // Ignore error if network doesn't exist
        console.log('Network not found or already removed');
      });

      // Add network again
      const networkParams = {
        chainId: '0x7A69',
        chainName: 'Hardhat Local',
        rpcUrls: ['http://127.0.0.1:8545/'],
        nativeCurrency: {
          name: 'Ethereum',
          symbol: 'ETH',
          decimals: 18
        }
      };

      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [networkParams],
      });

      // Switch to the new network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: networkParams.chainId }],
      });

      const networkValid = await verifyNetwork();
      setUserState(prev => ({
        ...prev,
        isCorrectNetwork: networkValid
      }));

    } catch (error) {
      console.error('Network reset failed:', error);
      throw new Error('Failed to reset network: ' + error.message);
    }
  };

  // Initialize wallet connection
  const handleConnect = async () => {
    setUiState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null,
      setupStatus: 'Starting setup...' 
    }));

    try {
      // Connect wallet
      setUiState(prev => ({ ...prev, setupStatus: 'Connecting wallet...' }));
      const result = await connectMetaMask();
      
      if (!result || !result.address) {
        throw new Error("Failed to connect to wallet");
      }

      const networkValid = await verifyNetwork();
      setUserState({
        account: result.address,
        networkName: `Chain ID: ${result.chainId}`,
        isCorrectNetwork: networkValid
      });

      setUiState(prev => ({ ...prev, setupStatus: 'Setup complete!' }));
    } catch (err) {
      console.error("Setup/Connection error:", err);
      setUiState(prev => ({ 
        ...prev, 
        error: err.message || "Failed to setup and connect" 
      }));
    } finally {
      setUiState(prev => ({ 
        ...prev, 
        isLoading: false,
        setupStatus: '' 
      }));
    }
  };

  // Handle account switching
  const handleAccountSwitch = async () => {
    setUiState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const newAccount = await switchAccount();
      setUserState(prev => ({
        ...prev,
        account: newAccount
      }));
    } catch (err) {
      console.error("Account switch error:", err);
      setUiState(prev => ({ 
        ...prev, 
        error: "Failed to switch account" 
      }));
    } finally {
      setUiState(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Handle network switching
  const handleNetworkSwitch = async () => {
    setUiState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      await switchNetwork(31337); // Hardhat local network
      const networkValid = await verifyNetwork();
      setUserState(prev => ({
        ...prev,
        isCorrectNetwork: networkValid
      }));
    } catch (err) {
      console.error("Network switch error:", err);
      setUiState(prev => ({ 
        ...prev, 
        error: "Failed to switch network" 
      }));
    } finally {
      setUiState(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Setup account change listener
  useEffect(() => {
    const cleanup = setupAccountListener(
      async (newAddress) => {
        if (newAddress) {
          const networkValid = await verifyNetwork();
          setUserState(prev => ({ 
            ...prev, 
            account: newAddress,
            isCorrectNetwork: networkValid 
          }));
        }
      },
      () => {
        setUserState(prev => ({ 
          ...prev, 
          account: null,
          isCorrectNetwork: false
        }));
      }
    );

    return cleanup;
  }, []);

  // UI helper for setup status
  const renderSetupStatus = () => {
    if (!uiState.setupStatus) return null;

    return (
      <Alert variant="info" className="mb-3">
        <Spinner animation="border" size="sm" className="me-2" />
        {uiState.setupStatus}
      </Alert>
    );
  };

  return (
    <Container className="mt-5">
      <Row className="justify-content-md-center">
        <Col md={8}>
          <div className="text-center mb-5">
            <h1 className="mb-4">Welcome to Dutch Auction</h1>
            <p className="lead mb-4">
              Participate in our token launch using a Dutch Auction mechanism.
            </p>
          </div>

          {uiState.error && (
            <Alert 
              variant="danger" 
              dismissible 
              onClose={() => setUiState(prev => ({ ...prev, error: null }))}
              className="mb-4"
            >
              {uiState.error}
            </Alert>
          )}

          {renderSetupStatus()}

          <Card className="mb-4">
            <Card.Header>Wallet Connection</Card.Header>
            <Card.Body>
              {!userState.account ? (
                <div className="d-grid">
                  <Button 
                    onClick={handleConnect} 
                    variant="primary" 
                    size="lg"
                    disabled={uiState.isLoading}
                  >
                    {uiState.isLoading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Setting up environment...
                      </>
                    ) : (
                      'Connect Wallet'
                    )}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="mb-3">
                    <strong>Connected Account:</strong>
                    <p className="mb-2">{userState.account}</p>
                    <strong>Network:</strong>
                    <p className="mb-2">{userState.networkName}</p>
                  </div>
                  
                  <div className="d-grid gap-2">
                    <Button
                      onClick={handleAccountSwitch}
                      variant="outline-primary"
                      disabled={uiState.isLoading}
                    >
                      {uiState.isLoading ? (
                        <Spinner animation="border" size="sm" />
                      ) : (
                        'Switch Account'
                      )}
                    </Button>

                    {!userState.isCorrectNetwork && (
                      <>
                        <Button
                          variant="warning"
                          onClick={async () => {
                            try {
                              setUiState(prev => ({ ...prev, isLoading: true, error: null }));
                              await resetLocalNetwork();
                            } catch (error) {
                              setUiState(prev => ({ 
                                ...prev, 
                                error: error.message 
                              }));
                            } finally {
                              setUiState(prev => ({ ...prev, isLoading: false }));
                            }
                          }}
                          disabled={uiState.isLoading}
                          className="mb-2"
                        >
                          {uiState.isLoading ? (
                            <>
                              <Spinner animation="border" size="sm" className="me-2" />
                              Resetting Network...
                            </>
                          ) : (
                            'Reset Local Network'
                          )}
                        </Button>
                        <Button
                          onClick={handleNetworkSwitch}
                          variant="outline-warning"
                          disabled={uiState.isLoading}
                        >
                          Switch to Correct Network
                        </Button>
                      </>
                    )}
                  </div>
                </>
              )}
            </Card.Body>
          </Card>

          <Card>
            <Card.Body>
              <div className="d-grid">
                <Button
                  as={Link}
                  to="/auction"
                  variant="secondary"
                  size="lg"
                  disabled={!userState.account || !userState.isCorrectNetwork}
                >
                  {!userState.account 
                    ? 'Connect Wallet to View Auction'
                    : !userState.isCorrectNetwork
                    ? 'Switch Network to View Auction'
                    : 'View Auction'
                  }
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Home;