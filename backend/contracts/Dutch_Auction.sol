// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol"; // For debugging purposes, can be removed in production

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function burn(address account, uint256 amount) external;
}

interface IBidder {
    function timestamp() external view returns (uint);
    function currentPrice() external view returns (uint);
    function getOwner() external view returns (address);
    function getBalance() external view returns (uint);
    function sendToOwner(uint amount) external payable;
    function sendToAccount(address payable account, uint amount) external payable;
}

contract DutchAuction {
    // Auction durations
    uint public constant AUCTION_DURATION = 20 minutes;
    uint public constant REVEAL_DURATION = 10 minutes;

    // Auction parameters
    IERC20 public immutable token;
    uint public immutable tokenQty;
    uint public immutable tokenId;

    address payable public immutable seller;
    uint public immutable startingPrice;
    uint public immutable discountRate;

    // Auction state variables
    uint public startAt;
    uint public revealAt;
    uint public endAt;
    bool public distributed;

    enum Status { NotStarted, Active, Revealing, Distributing, Ended }
    Status private status;

    // Token net worth pools
    uint private tokenNetWorthPool;
    uint private currentBidNetWorthPool;

    // Bidders tracking
    address[] private bidderList;
    mapping(address => bool) private seenBidders;

    // Events
    event AuctionCreated(address indexed seller, address indexed token, uint qty, uint startPrice, uint discountRate);
    event StartOfAuction();
    event DepositTokens(address indexed from, uint qty);
    event LogBid(address indexed from, uint price);
    event EndCommitStage();
    event EndRevealStage();
    event EndDistributingStage();
    event SuccessfulBid(address indexed bidder, uint qtyAllocated, uint refund);

    // Modifiers
    modifier onlyNotSeller() {
        require(msg.sender != seller, "The seller cannot perform this action");
        _;
    }

    modifier onlySeller() {
        require(msg.sender == seller, "Only the seller can perform this action");
        _;
    }

    modifier onlyNotStarted() {
        require(status == Status.NotStarted, "This auction has already started");
        _;
    }

    modifier onlyActive() {
        require(status == Status.Active, "This auction is no longer active");
        _;
    }

    modifier onlyRevealing() {
        require(status == Status.Revealing, "This auction is not in revealing stage");
        _;
    }

    modifier onlyDistributing() {
        require(status == Status.Distributing, "This auction is not in distributing stage");
        _;
    }

    modifier onlyEnded() {
        require(status == Status.Ended, "This auction is not ended");
        _;
    }

    // Constructor
    constructor(
        address _seller,
        uint _startingPrice,
        uint _discountRate,
        address _token,
        uint _tokenQty,
        uint _tokenId
    ) {
        seller = payable(_seller);
        startingPrice = _startingPrice;
        discountRate = _discountRate;
        token = IERC20(_token);
        tokenQty = _tokenQty;
        tokenId = _tokenId;

        require(_startingPrice >= _discountRate * AUCTION_DURATION, "Starting price is too low");

        tokenNetWorthPool = (startingPrice * tokenQty) / 10 ** 18;
        status = Status.NotStarted;

        emit AuctionCreated(seller, _token, tokenQty, startingPrice, discountRate);
    }

    // Start the auction
    function startAuction() external onlySeller onlyNotStarted {
        injectTokens();
        require(tokenQty == token.balanceOf(address(this)), "Not enough tokens injected");

        startAt = block.timestamp;
        revealAt = startAt + AUCTION_DURATION;
        endAt = revealAt + REVEAL_DURATION;
        status = Status.Active;

        emit StartOfAuction();
    }

    // Inject tokens into the auction
    function injectTokens() internal onlySeller onlyNotStarted {
        token.transferFrom(msg.sender, address(this), tokenQty);
        emit DepositTokens(msg.sender, tokenQty);
    }

    // Get current price of the token
    function getPrice(uint time_now) public view returns (uint) {
        if (status == Status.NotStarted) return startingPrice;
        if (status != Status.Active) return getReservePrice();

        uint timeElapsed = time_now - startAt;
        uint discount = discountRate * timeElapsed;
        return startingPrice - discount;
    }

    // Get the current token net worth
    function getCurrentTokenNetWorth(uint time_now) internal view returns (uint) {
        uint currentPrice = getPrice(time_now);
        return (currentPrice * tokenQty) / 10 ** 18;
    }

    // End the commit stage
    function endCommitStage() public onlyActive {
        status = Status.Revealing;
        emit EndCommitStage();
    }

    // End the reveal stage
    function endRevealStage() public onlyRevealing {
        status = Status.Distributing;
        emit EndRevealStage();
    }

    // End the distribution stage
    function endDistributingStage() public onlyDistributing {
        distributed = true;
        status = Status.Ended;
        emit EndDistributingStage();
    }

    // Get reserve price
    function getReservePrice() public view returns (uint) {
        return startingPrice - (AUCTION_DURATION * discountRate);
    }

    // Predict auction status based on the current time
    function auctionStatusPred(uint time_now) public view returns (Status) {
        if (startAt == 0) return Status.NotStarted;
        if (time_now >= startAt && time_now < revealAt) return Status.Active;
        if (time_now >= revealAt && time_now < endAt) return Status.Revealing;
        return distributed ? Status.Ended : Status.Distributing;
    }

    // Add a bidder to the list
    function addBidderToList(address _bidder) external {
        if (status == Status.Active) {
            endCommitStage();
        } else if (status != Status.Revealing) {
            return;
        }
        bidderList.push(_bidder);

        // Sort bidders by timestamp
        for (uint i = bidderList.length - 1; i > 0; i--) {
            IBidder bidder = IBidder(bidderList[i]);
            IBidder prevBidder = IBidder(bidderList[i - 1]);

            if (bidder.timestamp() < prevBidder.timestamp()) {
                address temp = bidderList[i - 1];
                bidderList[i - 1] = bidderList[i];
                bidderList[i] = temp;
            } else {
                break;
            }
        }
    }

    // Get the list of bidder
    function getBidderList() public view returns (address[] memory) {
        return bidderList;
    }

    // Distribute tokens to bidders
    function distributeToken() public payable onlyRevealing {
        endRevealStage();
        uint currentTokenNetWorth;
        uint currentBidNetWorth;
        uint finalPrice = startingPrice;
        bool exceededWorth = false;

        for (uint i = 0; i < bidderList.length; i++) {
            IBidder bidder = IBidder(bidderList[i]);
            address bidderAddress = bidder.getOwner();
            if (seenBidders[bidderAddress]) continue;

            seenBidders[bidderAddress] = true;
            uint bidderBalance = bidder.getBalance();
            currentTokenNetWorth = (bidder.currentPrice() * tokenQty) / 10 ** 18;
            currentBidNetWorth += bidderBalance;

            if (!exceededWorth) {
                finalPrice = bidder.currentPrice();
            } else {
                bidder.sendToOwner(bidderBalance);
                continue;
            }

            if (currentBidNetWorth >= currentTokenNetWorth) {
                uint refund = currentBidNetWorth - currentTokenNetWorth;
                bidder.sendToOwner(refund);
                exceededWorth = true;
            }
        }

        uint tokenQtyLeft = tokenQty;
        for (uint i = 0; i < bidderList.length; i++) {
            if (tokenQtyLeft <= 0) break;

            IBidder bidder = IBidder(bidderList[i]);
            uint bidderBalance = bidder.getBalance();
            uint qty = (bidderBalance * 10 ** 18) / finalPrice;

            // Send token to bidder
            console.log("qty left %s", tokenQtyLeft);
            console.log("transfer %s to %s", qty, bidder.getOwner());
            console.log("account balance %s", token.balanceOf(address(this)));
            console.log("Bidder balance %s", bidderBalance);
            console.log("final price %s", finalPrice);

            token.approve(address(this), min(qty, tokenQtyLeft));
            token.transferFrom(address(this), bidder.getOwner(), min(qty, tokenQtyLeft));

            // Send ether to seller
            bidder.sendToAccount(seller, (min(qty, tokenQtyLeft) * finalPrice) / 10 ** 18);
            tokenQtyLeft -= qty;
        }

        // Refund any unsold tokens
        if (tokenQtyLeft > 0) {
            token.burn(address(this), tokenQtyLeft);
        }
        
        endDistributingStage();
    }

    // Utility function to get the minimum of two numbers
    function min(uint256 a, uint256 b) pure internal returns (uint256) {
        return a < b ? a : b;
    }
}
