// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Interface for the Reveal contract
interface IReveal {
    function storeFactoryPlusBytes(
        address _owner,
        address _factory,
        bytes32 _byteCode
    ) external;
}

// Bidder Contract
contract Bidder {
    // Owner of the Bidder contract
    address payable private owner;

    // Timestamp for creation
    uint256 public timestamp;

    // Current bid price
    uint256 public currentBid;

    // Address of the Reveal contract
    address private revealContractAddr;

    // Track if the contract is active
    bool public isActive;

    // Constructor
    constructor(
        address payable _owner,
        address _revealContract,
        uint256 _currentBid
    ) payable {
        owner = _owner;
        revealContractAddr = _revealContract;
        currentBid = _currentBid;
        timestamp = block.timestamp; // Initialize timestamp
    }

    // Function to receive Ether (no data allowed)
    receive() external payable {}

    // Fallback function for when msg.data is not empty
    fallback() external payable {}

    // Modifier to restrict access to the owner
    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }

    // Get the owner's address
    function getOwner() external view returns (address) {
        return owner;
    }

    // Get the contract's Ether balance
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // Update the current bid amount
    function updateBid(uint256 amount) external onlyOwner {
        currentBid = amount; // Update current bid
    }

    // Send Ether to the owner
    function sendToOwner(uint256 amount) external onlyOwner {
        require(amount <= address(this).balance, "Not enough balance");
        owner.transfer(amount);
    }

    // Send Ether to a specified account
    function sendToAccount(address payable account, uint256 amount) external onlyOwner {
        require(amount <= address(this).balance, "Not enough balance");
        account.transfer(amount);
    }

    // Function to check if the contract is active
    function isContractActive() external view returns (bool) {
        return isActive;
    }
}

// Factory Contract for creating Bidder contracts
contract BidderFactory {
    // Address of the Reveal contract
    address private revealContractAddr;

    // Mapping to store Bidder addresses by owner
    mapping(address => address) private bidders;

    // Event emitted when a new Bidder is created
    event BidderCreated(address indexed owner, address indexed bidder);

    // Contract constructor
    constructor(address _revealContract) {
        revealContractAddr = _revealContract; // Initialize the Reveal contract address
    }

    // Create a new Bidder contract
    function createBidderContract(
        address payable _owner,
        uint256 _currentPrice
    ) public returns (address) {
        // Get bytecode for storing in the Reveal contract
        bytes32 byteCode = keccak256(
            abi.encodePacked(
                type(Bidder).creationCode,
                abi.encode(_owner, revealContractAddr)
            )
        );

        // Deploy the Bidder contract
        Bidder bidder = new Bidder(
            _owner,
            revealContractAddr,
            _currentPrice
        );

        // Store the factory and bytecode in the Reveal contract
        IReveal(revealContractAddr).storeFactoryPlusBytes(
            _owner,
            address(this),
            byteCode
        );

        // Store the address of the newly created Bidder
        bidders[_owner] = address(bidder);
        
        // Emit the BidderCreated event
        emit BidderCreated(_owner, address(bidder));
        
        return address(bidder); // Return the address of the created Bidder
    }

    // Get the stored Bidder address for the caller
    function getBidderAddress() public view returns (address) {
        return bidders[msg.sender];
    }

    // Get the Reveal contract address
    function getRevealContractAddress() public view returns (address) {
        return revealContractAddr;
    }
}