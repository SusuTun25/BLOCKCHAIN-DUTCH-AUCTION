import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert } from 'react-bootstrap';

const Auction = () => {
  const [currentPrice, setCurrentPrice] = useState(1); // Starting price in ETH
  const [timeLeft, setTimeLeft] = useState(1200); // 20 minutes in seconds
  const [auctionEnded, setAuctionEnded] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime <= 1) {
          clearInterval(timer);
          setAuctionEnded(true);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const priceInterval = setInterval(() => {
      setCurrentPrice(prevPrice => {
        if (prevPrice > 0.1) {
          return prevPrice - 0.05;
        }
        clearInterval(priceInterval);
        return prevPrice;
      });
    }, 10000); // Decrease price every 10 seconds

    return () => clearInterval(priceInterval);
  }, []);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Container className="mt-5">
      <Row className="justify-content-md-center">
        <Col md={8}>
          <h2 className="mb-4 text-center">Dutch Auction in Progress</h2>
          
          <Card className="text-center mb-4">
            <Card.Body>
              <Card.Title>Time Remaining</Card.Title>
              <Card.Text className="display-4">{formatTime(timeLeft)}</Card.Text>
            </Card.Body>
          </Card>
          
          <Alert variant="info" className="mb-4">
            <Alert.Heading>Current Price: {currentPrice.toFixed(2)} ETH</Alert.Heading>
          </Alert>
          
          <div className="d-grid gap-2">
            <Button 
              variant="primary" 
              size="lg" 
              disabled={auctionEnded}
              onClick={() => alert('Implement buy functionality')}
            >
              {auctionEnded ? 'Auction Ended' : 'Buy Token'}
            </Button>
          </div>

          {auctionEnded && (
            <Alert variant="warning" className="mt-4">
              The auction has ended. No more purchases can be made.
            </Alert>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default Auction;