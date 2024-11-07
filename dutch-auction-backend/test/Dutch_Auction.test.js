/**
 * For test the solidity contract created
 */

const { assert, expect } = require("chai");
const { network, deployments, ethers } = require("hardhat");
const {
  developmentChains,
  INITIAL_SUPPLY,
  INITIAL_SUPPLY_INT,
  RESERVE_PRICE,
  START_PRICE,
  CHANGEPERMIN,
} = require("../helper-hardhat-config");
const {
  time,
  helpers,
} = require("../node_modules/@nomicfoundation/hardhat-network-helpers");

/**
 * Test cases to add:
 * How to enforce successful bidder to pay Ether for the new token,
 * (I.e., they can’t cancel the bid) and how to refund bids that are invalid?
 *
 * Testing if the appropriate number of tokens are created
 *
 * Testing if the correct number of tokens are sent to the bidders
 *
 * Testing if the rest are burnt correctly
 *
 * Resistant to Re-Entry Attack
 *
 * Making testing more dynamic and less hard coded
 */

/**
 * Skips the testing if it is on a testnet, only tests on localhost
 * */

/**
 * Decribe function wraps the entire testing
 * @notice creates 4 accounts to be used: one deployer, and three users
 * This is to test different users bidding in the system
 * Accounts are provided by hardhat itself and are configured in hardhat.config.js
 */

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Dutch_Auction", function () {
      let Dutch_Auction_d;
      let Dutch_Auction_u_1;
      let Dutch_Auction_u_2;
      let Dutch_Auction_u_3;
      let ERC20Token;
      let deployer;
      let userOne;
      let userTwo;
      let userThree;
      beforeEach(async () => {
        // const accounts = await ethers.getSigners()
        // deployer = accounts[0]
        deployer = (await getNamedAccounts()).deployer;
        userOne = (await getNamedAccounts()).userOne;
        userTwo = (await getNamedAccounts()).userTwo;
        userThree = (await getNamedAccounts()).userThree;
        await deployments.fixture("all");
        Dutch_Auction_d = await ethers.getContract("Dutch_Auction", deployer);
        Dutch_Auction_u_1 = await ethers.getContract("Dutch_Auction", userOne);
        Dutch_Auction_u_2 = await ethers.getContract("Dutch_Auction", userTwo);
        Dutch_Auction_u_3 = await ethers.getContract(
          "Dutch_Auction",
          userThree
        );

        const transactionResponse0 = await Dutch_Auction_d.startAuction(
          INITIAL_SUPPLY_INT,
          CHANGEPERMIN
        );
        await transactionResponse0.wait();
      });

      /**
       * @title tests whether the constructor is working correctly
       * @custom tests 4 functionalities
       * 1. whether the reserve price has been set correctly
       * 2. whether the current price has been set correctly
       * 3. whether the number of algos has been set correctly
       * 4. whether the contract owner has been set correctly. --> this is to prevent the owner from bidding
       */
      describe("constructor", function () {
        it("sets the reservePrice addresses correctly", async () => {
          const responseRP = await Dutch_Auction_d.retrieveReservePrice();
          assert.equal(responseRP, RESERVE_PRICE);
        });
        it("sets the currentPrice addresses correctly", async () => {
          const responseCP = await Dutch_Auction_d.retrieveCurrentPrice();
          assert.equal(responseCP, START_PRICE);
        });
        it("sets the number of Algos correctly", async () => {
          const responseAlgos = await Dutch_Auction_d.retrieveTotalAlgos();
          assert.equal(responseAlgos, INITIAL_SUPPLY_INT);
        });
        it("sets the contract Owner correctly", async () => {
          const response = await Dutch_Auction_d.retrieveContractOwner();
          assert.equal(response, deployer);
        });
      });

      /**
       * @notice this describe function tests the addBidder functions and has a few functionalities to test
       * Each functionality is described below
       */

      describe("addBidder", function () {
        /**
         *  The owner should not be able to bid
         */
        it("Fails if owner tried to bid", async () => {
          await expect(
            Dutch_Auction_d.addBidder({
              value: ethers.parseEther("0.00000000000002"),
            })
          ).to.be.revertedWithCustomError(
            Dutch_Auction_d,
            `Dutch_Auction__IsOwner`
          );
        });

        /**
         * User One bids
         * Test if the remainingAlgos, BidderAlgos and contract balance are all updated correctly
         */
        it("Updates the contract balance for one user", async () => {
          await Dutch_Auction_u_1.addBidder({
            value: ethers.parseEther("0.000000000000001"),
          });
          const response = await Dutch_Auction_d.retrieveContractBalance();
          assert.equal(response, 1000);
        });

        /**
         * User One and Two bids
         * Test if the remainingAlgos, BidderAlgos and contract balance are all updated correctly
         */
        it("Updates the current balance for two users", async () => {
          await Dutch_Auction_u_1.addBidder({
            value: ethers.parseEther("0.000000000000001"),
          });
          await Dutch_Auction_u_2.addBidder({
            value: ethers.parseEther("0.000000000000001"),
          });
          const response = await Dutch_Auction_d.retrieveContractBalance();
          assert.equal(response, 2000);
        });

        /**
         * User One and Two bids, Then user one bids again
         * Test if the remainingAlgos, BidderAlgos, TotalBidders and contract balance are all updated correctly
         */

        it("Updates the total algos unsold available for one existing users", async () => {
          await Dutch_Auction_u_1.addBidder({
            value: ethers.parseEther("0.000000000000001"),
          });
          await Dutch_Auction_u_2.addBidder({
            value: ethers.parseEther("0.000000000000001"),
          });
          await Dutch_Auction_u_1.addBidder({
            value: ethers.parseEther("0.000000000000001"),
          });
          const response1 = await Dutch_Auction_d.retrieveContractBalance();
          const response2 = await Dutch_Auction_d.retrieveTotalBidder();
          const response3 = await Dutch_Auction_d.retrieveBidderBidValue(0);
          const response5 = await Dutch_Auction_d.retrieveBidderBidValue(2);
          const response4 = await Dutch_Auction_d.retrieveBidderBidValue(1);
          assert.equal(response1, 3000);
          assert.equal(response2, 3);
          assert.equal(response3 + response5, 2000);
          assert.equal(response4, 1000);
        });

        /**
         * Checking if the ERC20 tokens are sent properly
         *
         */
        it("Checking if the ERC20 Tokens are sent properly part 1", async () => {
          await Dutch_Auction_u_1.addBidder({
            value: ethers.parseEther("0.000000000000001"),
          });
          await Dutch_Auction_u_2.addBidder({
            value: ethers.parseEther("0.000000000000001"),
          });
          await Dutch_Auction_u_1.addBidder({
            value: ethers.parseEther("0.000000000000001"),
          });
          await Dutch_Auction_u_3.addBidder({
            value: ethers.parseEther("0.000000000000001"),
          });

          //bid 0: user 1
          //bid 1: user 2
          //bid 2: user 1 second bid
          //bid 3: user 3

          const remainingTokensBefore =
            await Dutch_Auction_d.retreiveContractER20Tokens();

          assert.equal(remainingTokensBefore, 200000000000000000000); //before
          const transactionResponse = await Dutch_Auction_d.endAuction();
          await transactionResponse.wait();

          const response0 = await Dutch_Auction_d.retrieveBidderAlgos(0);
          const response1 = await Dutch_Auction_d.retrieveBidderAlgos(1);
          const response2 = await Dutch_Auction_d.retrieveBidderAlgos(2);
          const response3 = await Dutch_Auction_d.retrieveBidderAlgos(3);

          const tokensToSendUserOne = response0 + response2;

          const tokensToSendUserTwo = response1;
          const tokensToSendUserThree = response3;

          assert.equal(tokensToSendUserOne, 40);
          assert.equal(tokensToSendUserTwo, 20);

          const tokenBalanceSent = await Dutch_Auction_d.balanceOfBidder(0);
          const tokenBalanceSent1 = await Dutch_Auction_d.balanceOfBidder(1);
          const tokenBalanceSent3 = await Dutch_Auction_d.balanceOfBidder(3);

          assert.equal(
            tokenBalanceSent,
            ethers.parseEther(tokensToSendUserOne.toString())
          );
          assert.equal(
            80000000000000000000,
            tokenBalanceSent + tokenBalanceSent1 + tokenBalanceSent3
          );

          const remainingTokens =
            await Dutch_Auction_d.retreiveContractER20Tokens();

          assert.equal(remainingTokens, 0); //because they are burnt
        });

        it("Checking if the ERC20 Tokens are sent properly (increment in time testing, reservation price is not hit, but all tokens sold out)", async () => {
          // 120 seconds = 2min
          // 50 - 2 * 15 = 20
          // 4000/20 = 200
          await Dutch_Auction_u_1.addBidder({
            value: ethers.parseEther("0.000000000000001"),
          });
          await Dutch_Auction_u_2.addBidder({
            value: ethers.parseEther("0.000000000000001"),
          });
          await Dutch_Auction_u_3.addBidder({
            value: ethers.parseEther("0.000000000000002"),
          });
          await Dutch_Auction_u_1.addBidder({
            value: ethers.parseEther("0.000000000000001"),
          });
          await time.increase(120);
          await Dutch_Auction_d.updateCurrentPrice();
          const response = await Dutch_Auction_d.retrieveCurrentPrice();
          assert.equal(response, 20);

          const transactionResponse = await Dutch_Auction_d.endAuction();
          await transactionResponse.wait();

          const response0 = await Dutch_Auction_d.retrieveBidderAlgos(0);
          const response1 = await Dutch_Auction_d.retrieveBidderAlgos(1);
          const response2 = await Dutch_Auction_d.retrieveBidderAlgos(2);
          const tokensToSend = ethers.parseEther(response0.toString());
          const tokensToSend1 = ethers.parseEther(response1.toString());
          const tokensToSend2 = ethers.parseEther(response2.toString());

          expect(await Dutch_Auction_d.balanceOfBidder(0)).to.equal(
            tokensToSend
          );
          expect(await Dutch_Auction_d.balanceOfBidder(1)).to.equal(
            tokensToSend1
          );
          expect(await Dutch_Auction_d.balanceOfBidder(2)).to.equal(
            tokensToSend2
          );
          assert.equal(response0, 50);
          assert.equal(response1, 50);
        });

        it("Checking if the ERC20 Tokens are sent properly (if the tokens run out before 20min and reservation price is hit)", async () => {
          await Dutch_Auction_u_1.addBidder({
            value: ethers.parseEther("0.000000000000001"),
          });
          await Dutch_Auction_u_2.addBidder({
            value: ethers.parseEther("0.000000000000001"),
          });
          await Dutch_Auction_u_1.addBidder({
            value: ethers.parseEther("0.000000000000001"),
          });

          const userOneBalanceBegin = await ethers.provider.getBalance(userOne);
          await time.increase(180);
          //50-3*15 = 50-45
          // since 5 is lower than the reserve price of 10 --> set price to 10

          await expect(
            Dutch_Auction_u_3.addBidder({
              value: ethers.parseEther("0.000000000000001"),
            })
          ).to.be.revertedWith("There is no more algos left");

          const ContractBalance = await ethers.provider.getBalance(
            Dutch_Auction_d.target
          );
          assert.equal(ContractBalance, 3000);

          await Dutch_Auction_d.updateCurrentPrice();
          const updateCurrentPrice =
            await Dutch_Auction_d.retrieveCurrentPrice();
          assert.equal(updateCurrentPrice, 10); // must be at reserve price

          const transactionResponse = await Dutch_Auction_d.endAuction();
          await transactionResponse.wait();

          const response0 = await Dutch_Auction_d.retrieveBidderAlgos(0);
          const response1 = await Dutch_Auction_d.retrieveBidderAlgos(1);
          const response2 = await Dutch_Auction_d.retrieveBidderAlgos(2);
          assert.equal(response0, 100);
          assert.equal(response1, 100);
          assert.equal(response2, 0);

          const tokensToSend = ethers.parseEther(response0.toString());
          const tokensToSend1 = ethers.parseEther(response1.toString());

          expect(await Dutch_Auction_d.balanceOfBidder(0)).to.equal(
            tokensToSend
          );
          expect(await Dutch_Auction_d.balanceOfBidder(1)).to.equal(
            tokensToSend1
          );

          const EndContractBalance = await ethers.provider.getBalance(
            Dutch_Auction_d.target
          );
          assert.equal(EndContractBalance, 2000);

          const userOneBalanceEnd = await ethers.provider.getBalance(userOne); //check the balance of userOne
          assert.equal(userOneBalanceEnd - userOneBalanceBegin, 1000);
        });

        it("Re Entry Attack Resistant", async () => {
          const userTwoBalanceBegin = await ethers.provider.getBalance(userTwo);
          const transactionResponse = await Dutch_Auction_u_2.addBidder({
            value: ethers.parseEther("0.000000000000001"),
          });
          const transactionReceipt = await transactionResponse.wait(1);
          const { gasUsed, gasPrice } = transactionReceipt;
          const gasCost = gasUsed * gasPrice;
          await Dutch_Auction_u_1.addBidder({
            value: ethers.parseEther("0.000000000000001"),
          });

          ReEntryAttack = await ethers.getContract("ReEntrancyAttack", userOne);

          const response = await ReEntryAttack.ReentranceAttack1();

          const attackerWalletBefore = await ethers.provider.getBalance(
            ReEntryAttack.target
          );
          await time.increase(1200); //trigger refund
          await Dutch_Auction_d.updateCurrentPrice();
          const updateCurrentPrice =
            await Dutch_Auction_d.retrieveCurrentPrice();
          assert.equal(updateCurrentPrice, 50); // must be at reserve price

          await expect(Dutch_Auction_d.endAuction()).to.be.revertedWith(
            "Failed to send ether"
          );

          // await Dutch_Auction_d.endAuction();

          //after experiments we know that there is a recursion limit on the functions --> maximally can run 58 times per refund call
          //per iteration you will get only 0.000000000000058
          //means you need to run at least 172413793103 times
          //Hence, a larger value is used to show the re entrancy resistance.

          const attackerWalletEnd = await ethers.provider.getBalance(
            ReEntryAttack.target
          );
          assert.equal(attackerWalletBefore - attackerWalletEnd, 0);
          const response0 = await Dutch_Auction_d.retrieveBidderAlgos(0);
          assert.equal(response0, 20);
          const userTwoBalanceEnd = await ethers.provider.getBalance(userTwo); //check the balance of userTwo
          //accounted for gas price
          assert.equal(
            userTwoBalanceBegin - (userTwoBalanceEnd + gasCost),
            1000
          );
          // the beginning should have more money

          //the attacker should have the same balance as before and not one ETH more
        });
        it("Re Entry Attack Resistant testing user bidding after attacker ", async () => {
          const userOneBalanceBegin = await ethers.provider.getBalance(userOne);
          await Dutch_Auction_u_1.addBidder({
            value: ethers.parseEther("0.000000000000002"),
          });

          ReEntryAttack = await ethers.getContract("ReEntrancyAttack", userOne);

          const response = await ReEntryAttack.ReentranceAttack2(); //attackers bids here

          await time.increase(120);
          const userTwoBalanceBegin = await ethers.provider.getBalance(userTwo);
          const transactionResponse = await Dutch_Auction_u_2.addBidder({
            value: ethers.parseEther("0.0000000000000005"),
          });

          const transactionReceipt = await transactionResponse.wait(1);
          const { gasUsed, gasPrice } = transactionReceipt;
          const gasCost = gasUsed * gasPrice;

          const attackerWalletBefore = await ethers.provider.getBalance(
            ReEntryAttack.target
          ); //this attacker wallet after the bid

          await time.increase(100); //trigger refund
          await Dutch_Auction_d.updateCurrentPrice();
          const updateCurrentPrice =
            await Dutch_Auction_d.retrieveCurrentPrice();
          assert.equal(updateCurrentPrice, 10); // must be at reserve price

          // await Dutch_Auction_d.endAuction();

          await expect(Dutch_Auction_d.endAuction()).to.be.revertedWith(
            "Failed to send ether"
          );

          const attackerWalletEnd = await ethers.provider.getBalance(
            ReEntryAttack.target
          );
          assert.equal(attackerWalletBefore - attackerWalletEnd, 0); //attacker's wallet should not have any eth inside
          const response2 = await Dutch_Auction_d.balanceOfBidder(2);
          assert.equal(response2, 0);
          const userTwoBalanceEnd = await ethers.provider.getBalance(userTwo); //check the balance of userOne
          assert.equal(userTwoBalanceBegin - userTwoBalanceEnd, gasCost);

          //the attacker should have the same balance as before and not one ETH more
        });
      });
    });