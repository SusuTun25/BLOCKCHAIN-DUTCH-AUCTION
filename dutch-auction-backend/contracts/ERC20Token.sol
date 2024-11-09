// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ERC20Token is Context, ERC20, Ownable {
    constructor(
        uint256 initialSupply,
        address contractAddress
    ) Ownable(msg.sender) ERC20("ERC20Token", "ET") {
        _mint(msg.sender, initialSupply * (10 ** decimals()));
        // Approve auction contract to spend tokens
        _approve(msg.sender, contractAddress, initialSupply * (10 ** decimals()));
    }

    function approveContract(address contractAddress, uint256 amount) public onlyOwner {
        _approve(msg.sender, contractAddress, amount * (10 ** decimals()));
    }

    function burn(address i_owner, uint256 amount) public onlyOwner {
        _burn(i_owner, amount * (10 ** decimals()));
    }
}