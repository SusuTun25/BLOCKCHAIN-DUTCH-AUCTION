// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// ERC20 Token Contract
contract Token is ERC20 {
    // Constructor to initialize the token with a name, ticker, and initial supply
    constructor(
        string memory name,
        string memory ticker,
        uint256 initialSupply
    ) ERC20(name, ticker) {
        _mint(msg.sender, initialSupply); // Mint the initial supply to the deployer's address
    }

    // Function to burn tokens from a specific account
    function burn(address account, uint256 amount) external {
        _burn(account, amount); // Burn the specified amount of tokens from the account
    }
}

// Token Factory Contract
contract TokenFactory {
    address[] public deployedTokens; // Array to track deployed token addresses
    uint256 public tokenCount; // Counter for the number of tokens deployed

    // Event to signal the deployment of a new token
    event TokenDeployed(address indexed tokenAddress);

    // Function to deploy a new token
    function deployToken(
        string calldata name,
        string calldata ticker,
        uint256 initialSupply
    ) public returns (address) {
        // Create a new Token instance
        Token token = new Token(name, ticker, initialSupply);
        
        // Transfer the entire supply to the deployer
        token.transfer(msg.sender, initialSupply);
        
        // Store the token address
        deployedTokens.push(address(token));
        tokenCount++; // Increment the total token count
        
        // Emit the TokenDeployed event
        emit TokenDeployed(address(token));
        
        return address(token); // Return the address of the newly created token
    }
}
