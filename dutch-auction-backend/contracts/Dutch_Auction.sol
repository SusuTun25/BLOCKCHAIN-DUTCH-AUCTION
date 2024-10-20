// SPDX-License-Identifier: MIT

pragma solidity ^0.8.21;


import "./ERC20Token.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

error Dutch_Auction__NotOwner();
error Dutch_Auction__IsOwner();
error Dutch_Auction__NotOpen();
error Dutch_Auction__Open();

contract Dutch_Auction is ReentrancyGuard {
    int256 private currentPrice; //in wei
    uint256 private totalNumBidders = 0;
    uint256 private immutable startPrice; //in wei
    uint256 private immutable reservePrice;
    address private immutable i_owner;
    uint256 private totalAlgosAvailable;
    uint256 private startTime;
    uint256 private constant AUCTION_TIME = 1200; //in seconds
    uint256 private currentUnsoldAlgos;
    uint256 private changePerMin;
    bool private prematureEnd = false;
    bool internal lock = false;
    bool internal attacked = false;

    ERC20Token private DAToken; //importing Token
    address private ERC20ContractAddress;
    mapping(uint256 => Bidder) public biddersList; //to be made private later <for debugging purposes>

    struct Bidder {
        uint256 bidderID;
        address walletAddress;
        uint256 bidValue; //the value they paid to the contract to purchase the algo
        uint256 totalAlgosPurchased;
        uint256 refundEth;
        bool isExist;
        bool tokenSent;
        bool ethRefunded;
    }

    // Variable to indicate auction's state --> type declaration
    enum AuctionState {
        OPEN,
        CLOSING
    } // uint256 0: OPEN, 1: CLOSED

    AuctionState private s_auctionState;

    /*Constructor*/
    constructor(uint256 _reservePrice, uint256 _startPrice) {
        require(
            _reservePrice < _startPrice,
            "reserve price is higher than current price"
        );
        i_owner = msg.sender;
        reservePrice = _reservePrice;
        currentPrice = int256(_startPrice);
        startPrice = _startPrice;
        startTime = 0;
        s_auctionState = AuctionState.CLOSING;
    }

    /* modifiers */
    modifier onlyOwner() {
        // require(msg.sender == owner);
        if (msg.sender != i_owner) revert Dutch_Auction__NotOwner();
        _; //do the rest of the function
    }

    modifier notOwner() {
        // require(msg.sender == owner);
        if (msg.sender == i_owner) revert Dutch_Auction__IsOwner();
        _; //do the rest of the function
    }

    modifier AuctionOpen() {
        // require(msg.sender == owner);
        if (AuctionState.CLOSING == s_auctionState)
            revert Dutch_Auction__NotOpen();
        _; //do the rest of the function
    }

    modifier AuctionClosed() {
        // require(msg.sender == owner);
        if (AuctionState.OPEN == s_auctionState) revert Dutch_Auction__Open();
        _; //do the rest of the function
    }

    /***
     * -------------------------------------------------------------------------------------
     * -------------------------------------------------------------------------------------
     * -------------------------------------------------------------------------------------
     * -------------------------------------------------------------------------------------
     * -------------------------------------------------------------------------------------
     */

    /** Events
     *
     */
    event startAuctionEvent(
        uint256 startTime,
        address ERC20Address,
        uint256 totalAlgosAvailable,
        uint256 changePerMin
    );
    event addBidderEvent(
        uint256 bidderID,
        address walletAddress,
        uint256 bidvalue
    );
    event updateCurrentPriceEvent(uint256 timeElapsed, uint256 currentprice);
    event sendTokenEvent(address bidderAddress, uint256 tokensSent);
    event calculateEvent(
        address bidderAddress,
        uint256 TokensPurchased,
        uint256 refundValue
    );

    event RefundEvent(
        address bidderAddress,
        uint256 TokensPurchased,
        uint256 refundValue
    );

    event endAuctionEvent(
        uint256 totalBidders,
        uint256 burntERC20,
        uint totalETHEarned
    );

    function startAuction(
        uint256 _totalAlgosAvailable,
        uint256 _changePerMin
    ) public onlyOwner AuctionClosed () {
        s_auctionState = AuctionState.OPEN;
        totalAlgosAvailable = _totalAlgosAvailable;
        changePerMin = _changePerMin;
        currentPrice = int256(startPrice);
        currentUnsoldAlgos = _totalAlgosAvailable;
        totalNumBidders = 0;
        startTime = block.timestamp; //Start time of when the contract is deployed
        DAToken = new ERC20Token(totalAlgosAvailable, address(this));
        ERC20ContractAddress = address(DAToken);
        emit startAuctionEvent(
            startTime,
            ERC20ContractAddress,
            totalAlgosAvailable,
            changePerMin
        );
    }

    /**
     * public functions
     *
     * */

    function addBidder() public payable notOwner AuctionOpen {
        //checking all the requirements
        require(msg.value > 0, "bidValue less than 0");

        calculate();
        require(msg.value > uint256(currentPrice), "bidValue less than current price");
        require(block.timestamp - startTime < AUCTION_TIME, "time is up");
        require(currentUnsoldAlgos > 0, "There is no more algos left");

        // Adding or Updating the bidders currently in the contract
        Bidder storage newBidder = biddersList[totalNumBidders];
        newBidder.bidderID = totalNumBidders;
        newBidder.walletAddress = msg.sender;
        newBidder.bidValue = msg.value;
        newBidder.isExist = true;
        newBidder.totalAlgosPurchased = 0;
        newBidder.refundEth = 0;
        newBidder.tokenSent = false;
        newBidder.ethRefunded = false;
        biddersList[totalNumBidders] = newBidder;
        emit addBidderEvent(
            newBidder.bidderID,
            newBidder.walletAddress,
            newBidder.bidValue
        );
        totalNumBidders++;
        calculate(); //calculate again in case the tokens are run out 
    }

    function updateCurrentPrice() public {
        if (!prematureEnd){
        currentPrice =
            int256(startPrice) -
            int256((block.timestamp - startTime) / 60) *
            int256(changePerMin);

        if (currentPrice <= 0 || currentPrice <= int256(reservePrice)) {
            currentPrice = int256(reservePrice);
        }
        emit updateCurrentPriceEvent(
            (block.timestamp - startTime),
            uint256(currentPrice)
        );
        }
    }

    function sendTokens() public onlyOwner AuctionClosed {
        for (uint i = 0; i < totalNumBidders; i++) {
            if (biddersList[i].totalAlgosPurchased > 0 && !biddersList[i].tokenSent) {
                uint256 totalAlgos = biddersList[i].totalAlgosPurchased;
                DAToken.approve(
                    biddersList[i].walletAddress,
                    totalAlgos * 10 ** 18
                );
                DAToken.transferFrom(
                    address(this),
                    biddersList[i].walletAddress,
                    totalAlgos * 10 ** 18
                );
                emit sendTokenEvent(
                    biddersList[i].walletAddress,
                    totalAlgos
                );
                biddersList[i].tokenSent = true;

            }
        }
    }

    function refundETH() public onlyOwner AuctionClosed {
        require(!lock, "Lock is held by the contract");
        lock = true;
        for (uint i = 0; i < totalNumBidders; i++) {
            if (
                biddersList[i].refundEth > 0 &&
                address(this).balance > biddersList[i].refundEth
            ) {
                //refundETH
                uint256 sendValue = biddersList[i].refundEth;
                biddersList[i].refundEth = 0; // re-entrancy attack prevention
                if (sendValue>0 && address(this).balance>sendValue){
                (bool callSuccess, ) = payable(biddersList[i].walletAddress)
                    .call{value: sendValue}("");
                require(callSuccess, "Failed to send ether"); 
                }
                emit RefundEvent(
                    biddersList[i].walletAddress,
                    biddersList[i].totalAlgosPurchased,
                    sendValue
                );
                sendValue = 0; 
                

            }
        }
        lock = false;
    }

    function calculate() public {
        updateCurrentPrice();
        uint256 currentAlgos = totalAlgosAvailable;
        for (uint i = 0; i < totalNumBidders; i++) {
            //if there is sufficient algos for this current bidder
            if (
                currentAlgos >= biddersList[i].bidValue / uint256(currentPrice)
            ) {
                biddersList[i].totalAlgosPurchased =
                    biddersList[i].bidValue /
                    uint256(currentPrice);
                currentAlgos -= biddersList[i].bidValue / uint256(currentPrice);
                biddersList[i].refundEth = 0;
            }
            //Else if there is algos left but it is less than the amount the bidder bidded
            // he gets all the remaining algos and is refunded the ETH.
            else if (
                currentAlgos > 0 &&
                currentAlgos < biddersList[i].bidValue / uint256(currentPrice)
            ) {
                biddersList[i].totalAlgosPurchased = currentAlgos;
                currentAlgos = 0;
                biddersList[i].refundEth =
                    biddersList[i].bidValue -
                    biddersList[i].totalAlgosPurchased *
                    uint256(currentPrice);
            }
            //there is no algos left
            // reset the total algos purchased to 0
            else if (currentAlgos <= 0) {
                //refund for the rest
                biddersList[i].totalAlgosPurchased = 0;
                biddersList[i].refundEth = biddersList[i].bidValue;
            }
        }

        if (currentAlgos > 0) {
            currentUnsoldAlgos = currentAlgos;
        } else {
            s_auctionState = AuctionState.CLOSING;
            currentUnsoldAlgos = 0;
            prematureEnd = true;
        }
    }

    function endAuction() public onlyOwner {
        s_auctionState = AuctionState.CLOSING;
        calculate();
        sendTokens();
        refundETH();
        if (currentUnsoldAlgos > 0) {
            DAToken.burn(address(this), currentUnsoldAlgos);
        }
        emit endAuctionEvent(
            totalNumBidders,
            currentUnsoldAlgos,
            address(this).balance
        );
    }

    /**View and Pure Function */

    function retrieveTotalAlgos() public view onlyOwner returns (uint256) {
        return totalAlgosAvailable;
    }

    function retrieveReservePrice() public view onlyOwner returns (uint256) {
        return reservePrice;
    }

    function retrieveCurrentPrice() public view returns (int256) {
        return currentPrice;
    }

    function retrieveTotalBidder() public view onlyOwner returns (uint256) {
        return totalNumBidders;
    }

    function retrieveContractOwner() public view returns (address) {
        return i_owner;
    }

    function retrieveContractBalance() public view onlyOwner returns (uint256) {
        return address(this).balance;
    }

    function retrieveBidderBidValue(
        uint256 bidder
    ) public view onlyOwner returns (uint256) {
        return biddersList[bidder].bidValue;
    }

    function retrieveBidderAlgos(
        uint256 bidder
    ) public view onlyOwner returns (uint256) {
        return biddersList[bidder].totalAlgosPurchased;
    }

    function retrieveRefund(
        uint256 bidder
    ) public view onlyOwner returns (uint256) {
        return biddersList[bidder].refundEth;
    }

    function balanceOfBidder(uint256 bidder) public view returns (uint256) {
        return DAToken.balanceOf(biddersList[bidder].walletAddress);
    }

    function getAuctionState() public view returns (AuctionState) {
        return s_auctionState;
    }

    function getRefundState(uint256 bidder) public view returns (bool){
        return biddersList[bidder].ethRefunded;
    }

    function getUnsoldAlgos() public view returns (uint256){
        return currentUnsoldAlgos;
    }

    function retreiveContractER20Tokens() public view returns(uint256){
        return DAToken.balanceOf(address(this));
    }

    function retrieveTimeElapsed() public view returns(uint256){
        if (startTime>0){
        return (block.timestamp - startTime) / 60;}
        else{
            return 0;
        }

    }

    fallback() external payable {
        // addBidder();
    }

    receive() external payable {
        // addBidder();
    }




}