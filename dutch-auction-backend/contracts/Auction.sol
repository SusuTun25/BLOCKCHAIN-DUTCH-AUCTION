// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ERC20Token.sol";
import "./Bidder.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract DutchAuction is ReentrancyGuard {
    address public owner;
    ERC20Token public token;
    Bidder public bidderContract;

    uint256 public startPrice;
    uint256 public reservePrice;
    uint256 public auctionDuration;
    uint256 public startTime;
    uint256 public totalTokensAvailable;
    uint256 public priceDecrement;
    uint256 public totalFundsRaised;
    uint256 public timeElapsed;
    bool public auctionStarted;

    enum AuctionState {
        OPEN,
        PAUSED,
        CLOSED
    }
    AuctionState public auctionState;

    event AuctionStarted(
        uint256 startTime,
        uint256 startPrice,
        uint256 reservePrice,
        uint256 totalTokens
    );
    event AuctionPaused();
    event AuctionResumed();
    event BidPlaced(
        address indexed bidder,
        uint256 bidAmount,
        uint256 tokensAllocated
    );
    event AuctionEnded(uint256 totalFundsRaised, uint256 unsoldTokens);
    event TokensClaimed(
        uint256 indexed bidderID,
        address indexed bidder,
        uint256 amount
    );
    event Debug(string message, uint256 value);
    event TokensUpdated(uint256 previousAmount, uint256 newAmount);

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
        token = ERC20Token(_token);
        bidderContract = Bidder(_bidderContract);
        startPrice = _startPrice;
        reservePrice = _reservePrice;
        auctionDuration = _auctionDuration;
        totalTokensAvailable = _totalTokens;
        priceDecrement = _priceDecrement;
        auctionState = AuctionState.CLOSED;
    }

    function startAuction() public onlyOwner {
        require(
            auctionState == AuctionState.CLOSED,
            "Auction already started or paused"
        );
        require(!auctionStarted, "Auction already started");
        startTime = block.timestamp;
        auctionState = AuctionState.OPEN;
        auctionStarted = true;
        timeElapsed = 0;
        emit AuctionStarted(
            startTime,
            startPrice,
            reservePrice,
            totalTokensAvailable
        );
    }

    function getStartTime() external view returns (uint256) {
        return startTime;
    }

    function incrementTime(uint256 secondsToAdd) external {
        timeElapsed += secondsToAdd;
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

        uint256 elapsedTime = block.timestamp - startTime; // Calculate elapsed time based on block.timestamp
        if (elapsedTime >= auctionDuration) {
            return 0; // Auction has ended
        }

        return auctionDuration - elapsedTime; // Return remaining time in seconds
    }

    function checkAndEndAuction() public {
        require(auctionStarted, "Auction has not started");

        uint256 elapsedTime = block.timestamp - startTime;
        emit Debug("Elapsed time", elapsedTime);

        if (elapsedTime >= auctionDuration) {
            emit Debug(
                "Auction duration met. Ending auction.",
                auctionDuration
            );
            endAuction();
        } else {
            emit Debug("Auction still ongoing", auctionDuration - elapsedTime);
        }
    }

    function resumeAuction() public onlyOwner {
        require(auctionState == AuctionState.PAUSED, "Auction is not paused");
        auctionState = AuctionState.OPEN;
        emit AuctionResumed();
    }

    function getCurrentPrice() public view returns (uint256) {
        if (block.timestamp >= startTime + auctionDuration) {
            return reservePrice; // Auction ended
        }
        uint256 elapsedMinutes = (block.timestamp - startTime) / 60;
        uint256 priceDecrease = elapsedMinutes * priceDecrement;
        return
            (startPrice > priceDecrease)
                ? (startPrice - priceDecrease)
                : reservePrice;
    }

    function placeBid() public payable nonReentrant {
        uint256 previousTokens = totalTokensAvailable;

        require(auctionState == AuctionState.OPEN, "Auction is not open");
        uint256 currentPrice = getCurrentPrice();
        require(msg.value >= currentPrice, "Bid below current price");

        uint256 tokensToBuy = (msg.value * 1e18) / currentPrice;
         if (tokensToBuy < totalTokensAvailable) {
            totalTokensAvailable -= tokensToBuy;
        } else {
            tokensToBuy = totalTokensAvailable;
            totalTokensAvailable = 0;
        }
        
        totalFundsRaised += msg.value;

        bidderContract.addBidder(msg.sender, msg.value);
        uint256 bidderID = getBidderID(msg.sender);
        bidderContract.setTokensPurchased(bidderID,tokensToBuy);

        emit BidPlaced(msg.sender, msg.value, tokensToBuy);
        emit TokensUpdated(previousTokens, totalTokensAvailable);

        if (
            totalTokensAvailable == 0 ||
            block.timestamp >= startTime + auctionDuration
        ) {
            endAuction();
        }
    }

    function endAuction() internal {
        emit Debug("Starting endAuction", totalTokensAvailable);

        auctionState = AuctionState.CLOSED;
        uint256 unsoldTokens = totalTokensAvailable;
        emit Debug("Auction state set to CLOSED", uint256(auctionState));

        // Transfer funds to owner
        bool transferSuccess = payable(owner).send(totalFundsRaised);
        require(transferSuccess, "Owner fund transfer failed");
        emit Debug("Owner funds transferred", totalFundsRaised);

         // Burn unsold tokens if any
        if (unsoldTokens > 0) {
            emit Debug("Burning unsold tokens", unsoldTokens);
            token.burn(address(this), unsoldTokens); // Burn unsold tokens from contract's balance
        }

        emit AuctionEnded(totalFundsRaised, unsoldTokens);
    }

    function sendTokens() public {
        require(auctionState == AuctionState.CLOSED, "Auction has not ended");

        uint256 totalBidders = bidderContract.totalBidders();
        emit Debug("Total Bidders", totalBidders);

        for (uint i = 0; i < totalBidders; i++) {
            Bidder.BidderInfo memory bidder = bidderContract.getBidderInfo(i);
            emit Debug("Processing Bidder", i);

            if (bidder.tokensPurchased > 0 && !bidder.tokenSent) {
                uint256 tokensOwed = bidder.tokensPurchased;
                emit Debug("Tokens to be sent", tokensOwed);
                emit Debug(
                    "Bidder wallet address",
                    uint256(uint160(bidder.walletAddress))
                );

                bidderContract.markTokensAsClaimed(i);

                bool transferSuccess = token.transfer(
                    bidder.walletAddress,
                    tokensOwed
                );
                require(transferSuccess, "Token transfer failed");

                emit TokensClaimed(i, bidder.walletAddress, tokensOwed);
            } else {
                if (bidder.tokensPurchased == 0) {
                    emit Debug("No tokens to be sent for Bidder", i);
                }
                if (bidder.tokenSent) {
                    emit Debug("Tokens already sent for Bidder", i);
                }
            }
        }
    }

    function withdrawFunds() public onlyOwner {
        require(auctionState == AuctionState.CLOSED, "Auction is not closed");
        payable(owner).transfer(totalFundsRaised);
    }

    function withdrawRefund(uint256 bidderID) public nonReentrant {
        Bidder.BidderInfo memory bidder = bidderContract.getBidderInfo(
            bidderID
        );
        uint256 refundAmount = bidder.refundEth;
        require(refundAmount > 0, "No refund available");

        bidderContract.setRefund(bidderID, 0);
        (bool success, ) = msg.sender.call{value: refundAmount}("");
        require(success, "Refund transfer failed");
    }

    function claimTokens(uint256 bidderID) public nonReentrant {
        require(auctionState == AuctionState.CLOSED, "Auction is not closed");

        Bidder.BidderInfo memory bidder = bidderContract.getBidderInfo(
            bidderID
        );
        require(msg.sender == bidder.walletAddress, "Not the bidder");
        require(!bidder.tokenSent, "Tokens already claimed");
        require(bidder.tokensPurchased > 0, "No tokens to claim");

        bidderContract.markTokensAsClaimed(bidderID);

        bool transferSuccess = token.transfer(
            msg.sender,
            bidder.tokensPurchased
        );
        require(transferSuccess, "Token transfer failed");

        emit TokensClaimed(bidderID, msg.sender, bidder.tokensPurchased);
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

    function getBidderInfo(
        uint256 bidderID
    ) public view returns (Bidder.BidderInfo memory) {
        return bidderContract.getBidderInfo(bidderID);
    }

    function getBidderID(address bidderAddress) public view returns (uint256) {
        uint256 totalBids = bidderContract.totalBidders();
        for (uint256 i = 0; i < totalBids; i++) {
            Bidder.BidderInfo memory bidder = bidderContract.getBidderInfo(i);
            if (bidder.walletAddress == bidderAddress) {
                return i;
            }
        }
        revert("Bidder not found");
    }
}
