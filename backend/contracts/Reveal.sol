// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Interface for Submarine contracts
interface Ibidder {
    function getOwner() external view returns (address);
}

// Interface for Dutch Auction contracts
interface IDutchAuction {
    function addBidderToList(address _bidder) external;
}

// Reveal Contract
contract Reveal {
    // Mapping to store factory addresses associated with their owners
    mapping(address => address) private factories;

    // Mapping to store bytecode associated with each owner
    mapping(address => bytes32) private byteCodes;

    // Event to log when a factory and bytecode are stored
    event FactoryBytesStored(address indexed owner, address indexed factory, bytes32 byteCode);

    // Store factory address and bytecode for a given owner
    function storeFactoryPlusBytes(
        address _owner,
        address _factory,
        bytes32 _byteCode
    ) external {
        factories[_owner] = _factory;  // Store the factory address
        byteCodes[_owner] = _byteCode;  // Store the bytecode
        emit FactoryBytesStored(_owner, _factory, _byteCode); // Emit event
    }

    // Reveal execution to add bidder to Dutch auction
    function revealExecution(
        address bidderAddress,
        address dutchAuctionAddress
    ) public {
        // Get the owner of the bidder contract
        address bidOwner = Ibidder(bidderAddress).getOwner();

        // Ensure that the owner of the bidder contract is also the message sender
        require(bidOwner == msg.sender, "Caller is not the owner of the bid");

        // Add the bidder to the Dutch auction's list
        IDutchAuction(dutchAuctionAddress).addBidderToList(bidderAddress);
    }
}
