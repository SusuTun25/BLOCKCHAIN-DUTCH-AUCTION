// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Bidder {
    struct BidderInfo {
        uint256 bidderID;
        address walletAddress;
        uint256 bidValue;           // Amount of ETH they sent to the auction
        uint256 tokensPurchased;    // Number of tokens allocated to this bidder
        uint256 refundEth;          // Amount of ETH to be refunded if not enough tokens
        bool tokenSent;             // Flag indicating if tokens have been transferred
        bool ethRefunded;           // Flag indicating if Ether has been refunded
    }

    mapping(uint256 => BidderInfo) public bidders;
    uint256 public totalBidders;

    event BidderAdded(uint256 indexed bidderID, address walletAddress, uint256 bidValue);
    event TokensAllocated(uint256 indexed bidderID, uint256 tokensPurchased);
    event RefundSet(uint256 indexed bidderID, uint256 refundAmount);

    /**
     * @dev Adds a new bidder to the bidders mapping.
     * @param _walletAddress The wallet address of the bidder.
     * @param _bidValue The amount of ETH sent by the bidder.
     */
    function addBidder(address _walletAddress, uint256 _bidValue) public {
        uint256 bidderID = totalBidders;
        
        bidders[bidderID] = BidderInfo({
            bidderID: bidderID,
            walletAddress: _walletAddress,
            bidValue: _bidValue,
            tokensPurchased: 0,
            refundEth: 0,
            tokenSent: false,
            ethRefunded: false
        });

        emit BidderAdded(bidderID, _walletAddress, _bidValue);
        totalBidders++;
    }

    /**
     * @dev Sets the number of tokens purchased by a bidder.
     * @param _bidderID The ID of the bidder.
     * @param _tokensPurchased The number of tokens allocated to the bidder.
     */
    function setTokensPurchased(uint256 _bidderID, uint256 _tokensPurchased) public {
        require(_bidderID < totalBidders, "Invalid bidder ID");
        bidders[_bidderID].tokensPurchased = _tokensPurchased;
        emit TokensAllocated(_bidderID, _tokensPurchased);
    }

    /**
     * @dev Sets the refund amount for a bidder.
     * @param _bidderID The ID of the bidder.
     * @param _refundAmount The amount of ETH to be refunded.
     */
    function setRefund(uint256 _bidderID, uint256 _refundAmount) public {
        require(_bidderID < totalBidders, "Invalid bidder ID");
        bidders[_bidderID].refundEth = _refundAmount;
        emit RefundSet(_bidderID, _refundAmount);
    }

    /**
     * @dev Retrieves the information of a specific bidder.
     * @param _bidderID The ID of the bidder to retrieve.
     * @return The BidderInfo struct for the specified bidder.
     */
    function getBidderInfo(uint256 _bidderID) public view returns (BidderInfo memory) {
        require(_bidderID < totalBidders, "Invalid bidder ID");
        return bidders[_bidderID];
    }
}
