// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ERC20Token is Context, ERC20, Ownable {
    constructor(
        uint256 initialSupply,
        address contractAddress
    ) Ownable(msg.sender) ERC20("ERC20Token", "ET") {
        _mint(msg.sender, initialSupply * (10 ** 18));
        approve(contractAddress, initialSupply * (10 ** 18));
    }

    function burn(address i_owner, uint256 amount) public onlyOwner {
        _burn(i_owner, amount * 10 ** 18);
    }
}