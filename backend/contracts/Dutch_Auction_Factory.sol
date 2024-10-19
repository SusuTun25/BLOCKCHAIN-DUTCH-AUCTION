// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Dutch_Auction.sol"; // Import the DutchAuction contract

contract DutchAuctionFactory {
    // State variables to track auctions
    address[] public auctions; // Array to hold deployed auction addresses
    uint256 public auctionCount; // Counter for the number of auctions deployed

    // Events to log significant actions
    event AuctionDeployed(address indexed auctionAddress); // Emit when an auction is deployed

    // Function to deploy a new Dutch Auction
    function deployAuction(
        address _token,      // Address of the token to be auctioned
        uint _qty,          // Quantity of tokens available for the auction
        uint _startPrice,   // Starting price of the auction
        uint _discountRate   // Discount rate applied to the auction price
    ) public returns (address) {
        // Create a new instance of the DutchAuction contract
        DutchAuction dutchAuction = new DutchAuction(
            msg.sender,         // Seller is the deployer of the auction
            _startPrice,       // Starting price
            _discountRate,     // Discount rate
            _token,            // Token address
            _qty,              // Token quantity
            auctionCount + 1   // Auction ID (1-based index)
        );

        // Store the address of the deployed auction
        auctions.push(address(dutchAuction));

        // Increment the auction count
        auctionCount++;

        // Emit the AuctionDeployed event
        emit AuctionDeployed(address(dutchAuction));

        // Return the address of the newly created auction
        return address(dutchAuction);
    }

    // Function to retrieve all auction addresses
    function getAuctions() external view returns (address[] memory) {
        return auctions; // Return the list of auction addresses
    }
}
