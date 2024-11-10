const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DutchAuction Reentrancy Tests", function () {
  let dutchAuction;
  let token;
  let bidder;
  let owner;
  let attacker;
  let other;
  let maliciousContract;
  let totalSupply;

  beforeEach(async function () {
    // Get signers
    [owner, attacker, other] = await ethers.getSigners();

    try {
      // Deploy ERC20Token
      const ERC20Token = await ethers.getContractFactory("ERC20Token");
      const totalSupply = ethers.parseUnits("1", 18);
      erc20Token = await ERC20Token.deploy(totalSupply, owner.address);
      await erc20Token.waitForDeployment();
      console.log("ERC20Token deployed to:", await erc20Token.getAddress());

      // Deploy Bidder contract
      const Bidder = await ethers.getContractFactory("Bidder");
      bidder = await Bidder.deploy();
      await bidder.waitForDeployment();
      console.log("Bidder contract deployed to:", await bidder.getAddress());

      // Deploy DutchAuction contract
      const DutchAuction = await ethers.getContractFactory("DutchAuction");
      dutchAuction = await DutchAuction.deploy(
        await erc20Token.getAddress(),
        await bidder.getAddress(),
        ethers.parseEther("1"),     // startPrice
        ethers.parseEther("0.1"),   // reservePrice
        3600,                      // auctionDuration
        totalSupply,  // totalTokens
        ethers.parseEther("0.0001") // priceDecrement
      );
      await dutchAuction.waitForDeployment();
      console.log("DutchAuction contract deployed to:",  await dutchAuction.getAddress());

      // Deploy Malicious Contract
      const MaliciousContract = await ethers.getContractFactory("MaliciousContract");
      maliciousContract = await MaliciousContract.deploy(await dutchAuction.getAddress());
      console.log("Malicious contract deployed to:", await maliciousContract.getAddress());

      // Setup tokens for auction
      const setupTokenForAuction = async (token, auctionAddress, totalSupply) => {
        try {
          // Approve auction contract to spend tokens
          const tx = await token.approve(auctionAddress, totalSupply);
          await tx.wait();
          console.log(`Approved auction contract to spend ${totalSupply} tokens`);
        
          // Transfer tokens to auction contract
          const transferTx = await token.transfer(auctionAddress, totalSupply);
          await transferTx.wait();
          console.log(`Transferred ${totalSupply} tokens to auction contract`);
        } catch (error) {
          console.error('Error setting up tokens for auction:', error);
          throw error;
        }
      };
      await setupTokenForAuction(erc20Token, dutchAuction.getAddress(), totalSupply);
      
      // Start the auction
      console.log("Starting auction...");
      const tx = await dutchAuction.startAuction();
      await tx.wait();
      console.log("Auction started successfully");

      // Verify auction state
      const auctionStarted = await dutchAuction.auctionStarted();
      console.log("Auction started status:", auctionStarted);
      
      const currentPrice = await dutchAuction.getCurrentPrice();
      console.log("Current auction price:", hre.ethers.formatEther(currentPrice));
      
      const remainingTokens = await dutchAuction.getRemainingTokens();
      console.log("Remaining tokens:", hre.ethers.formatUnits(remainingTokens, 18));

    } catch (error) {
      console.error("Deployment Error:", error);
      throw error;
    }
  });

  describe("Reentrancy Attack Tests", function () {
    it("should prevent reentrancy in placeBid function", async function () {
      const bidAmount = await dutchAuction.getCurrentPrice();

      console.log("Current Bid Amount:",bidAmount);

      const tx = await maliciousContract.connect(attacker).attackPlaceBid({
        value: bidAmount,
        gasLimit: 300000
      });

      await tx.wait();

      console.log("Malicious Bidder address:", await maliciousContract.getAddress());

      const bidderId = await dutchAuction.getBidderID(maliciousContract.getAddress());
      console.log("Bidder ID:", bidderId);

      let claimTx = await maliciousContract.connect(attacker).attackClaimTokens(bidderId);
      await claimTx.wait(); // Wait for the first claim to complete

      await expect(
        maliciousContract.connect(attacker).attackClaimTokens(bidderId)
      ).to.be.revertedWith("Tokens already claimed");

    });
  });

});