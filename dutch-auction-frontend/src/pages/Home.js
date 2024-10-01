import React from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <Container className="mt-5">
      <Row className="justify-content-md-center">
        <Col md={8} className="text-center">
          <h1 className="mb-4">Welcome to Dutch Auction</h1>
          <p className="lead mb-4">
            Participate in our token launch using a Dutch Auction mechanism.
          </p>
          <Button as={Link} to="/auction" variant="primary" size="lg">
            View Auction
          </Button>
        </Col>
      </Row>
    </Container>
  );
};

export default Home;