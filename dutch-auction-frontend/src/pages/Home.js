import React, { useState } from 'react';
import { Container, Row, Col, Button, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { connectMetaMask } from '../utils/ethereum';

const Home = () => {
  const [account, setAccount] = useState(null);
  const [error, setError] = useState(null);

  const handleConnect = async () => {
    try {
      const result = await connectMetaMask();
      if (result && result.address) {
        setAccount(result.address);
        setError(null);
      } else {
        setError("Failed to connect to MetaMask. Please make sure it's installed and unlocked.");
      }
    } catch (err) {
      console.error("Error in handleConnect:", err);
      setError("An error occurred while connecting to MetaMask.");
    }
  };

  return (
    <Container className="mt-5">
      <Row className="justify-content-md-center">
        <Col md={8} className="text-center">
          <h1 className="mb-4">Welcome to Dutch Auction</h1>
          <p className="lead mb-4">
            Participate in our token launch using a Dutch Auction mechanism.
          </p>
          {!account ? (
            <Button onClick={handleConnect} variant="primary" size="lg" className="mb-3">
              Connect MetaMask
            </Button>
          ) : (
            <Alert variant="success">
              Connected: {account}
            </Alert>
          )}
          {error && (
            <Alert variant="danger" className="mt-3">
              {error}
            </Alert>
          )}
          <div>
            <Button as={Link} to="/auction" variant="secondary" size="lg">
              View Auction
            </Button>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default Home;