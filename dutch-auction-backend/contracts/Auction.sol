// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ERC20Token.sol";
import "./Bidder.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract DutchAuction is ReentrancyGuard {
    address public owner;
    IERC20 public token;
    Bidder public bidderContract;

    uint256 public startPrice;
    uint256 public reservePrice;
    uint256 public auctionDuration;
    uint256 public startTime;
    uint256 public totalTokensAvailable;
    uint256 public priceDecrement;
    uint256 public totalFundsRaised;
    bool public auctionStarted;

    enum AuctionState { OPEN, PAUSED, CLOSED }
    AuctionState public auctionState;

    event AuctionStarted(uint256 startTime, uint256 startPrice, uint256 reservePrice, uint256 totalTokens);
    event AuctionPaused();
    event AuctionResumed();
    event BidPlaced(address indexed bidder, uint256 bidAmount, uint256 tokensAllocated);
    event AuctionEnded(uint256 totalFundsRaised, uint256 unsoldTokens);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    constructor(
        address _token,
        address _bidderContract,
        uint256 _startPrice,
        uint256 _reservePrice,
        uint256 _auctionDuration,
        uint256 _totalTokens,
        uint256 _priceDecrement
    ) {
        owner = msg.sender;
        token = IERC20(_token);
        bidderContract = Bidder(_bidderContract);
        startPrice = _startPrice;
        reservePrice = _reservePrice;
        auctionDuration = _auctionDuration;
        totalTokensAvailable = _totalTokens;
        priceDecrement = _priceDecrement;
        auctionState = AuctionState.CLOSED;
    }

    function startAuction() public onlyOwner {
        require(auctionState == AuctionState.CLOSED, "Auction already started or paused");
        startTime = block.timestamp;
        auctionState = AuctionState.OPEN;
        auctionStarted = true;
        emit AuctionStarted(startTime, startPrice, reservePrice, totalTokensAvailable);
    }

    function pauseAuction() public onlyOwner {
        require(auctionState == AuctionState.OPEN, "Auction is not open");
        auctionState = AuctionState.PAUSED;
        emit AuctionPaused();
    }

    function getTimeRemaining() public view returns (uint256) {
        if (!auctionStarted) {
            return auctionDuration; // If auction hasn't started, return full duration
        }
        uint256 elapsedTime = block.timestamp - startTime;
        if (elapsedTime >= auctionDuration) {
            return 0; // Auction has ended
        }
        return auctionDuration - elapsedTime;
    }

    function resumeAuction() public onlyOwner {
        require(auctionState == AuctionState.PAUSED, "Auction is not paused");
        auctionState = AuctionState.OPEN;
        emit AuctionResumed();
    }

    function getCurrentPrice() public view returns (uint256) {
        if (block.timestamp >= startTime + auctionDuration) {
            return reservePrice;
        }
        uint256 elapsedMinutes = (block.timestamp - startTime) / 60;
        uint256 priceDecrease = elapsedMinutes * priceDecrement;
        return (startPrice > priceDecrease) ? (startPrice - priceDecrease) : reservePrice;
    }

    function placeBid() public payable nonReentrant {
        require(auctionState == AuctionState.OPEN, "Auction is not open");
        uint256 currentPrice = getCurrentPrice();
        // require(msg.value >= currentPrice, "Bid below current price");

        uint256 tokensToBuy = msg.value / currentPrice;
        require(tokensToBuy <= totalTokensAvailable, "Not enough tokens left");

        totalTokensAvailable -= tokensToBuy;
        totalFundsRaised += msg.value;

        bidderContract.addBidder(msg.sender, msg.value);
        bidderContract.setTokensPurchased(bidderContract.totalBidders() - 1, tokensToBuy);

        emit BidPlaced(msg.sender, msg.value, tokensToBuy);

        if (totalTokensAvailable == 0 || block.timestamp >= startTime + auctionDuration) {
            endAuction();
        }
    }

    function endAuction() internal {
        auctionState = AuctionState.CLOSED;
        uint256 unsoldTokens = totalTokensAvailable;

        payable(owner).transfer(totalFundsRaised);

        if (unsoldTokens > 0) {
            token.transfer(owner, unsoldTokens);
        }

        emit AuctionEnded(totalFundsRaised, unsoldTokens);
    }

    function withdrawFunds() public onlyOwner {
        require(auctionState == AuctionState.CLOSED, "Auction is not closed");
        payable(owner).transfer(totalFundsRaised);
    }

    function withdrawRefund() public nonReentrant {
        uint256 refundAmount = bidderContract.getBidderInfo(bidderContract.totalBidders() - 1).refundEth;
        require(refundAmount > 0, "No refund available");

        bidderContract.setRefund(bidderContract.totalBidders() - 1, 0);
        (bool success, ) = msg.sender.call{value: refundAmount}("");
        require(success, "Refund transfer failed");
    }

    function getAuctionStatus() public view returns (AuctionState) {
        return auctionState;
    }

    function getRemainingTokens() public view returns (uint256) {
        return totalTokensAvailable;
    }

    function getTotalFundsRaised() public view returns (uint256) {
        return totalFundsRaised;
    }

    function getBidderInfo(uint256 bidderID) public view returns (Bidder.BidderInfo memory) {
        return bidderContract.getBidderInfo(bidderID);
    }
}
