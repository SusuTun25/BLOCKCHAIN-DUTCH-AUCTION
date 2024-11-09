const hre = require("hardhat");
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const envFilePath = path.resolve(__dirname, '../../dutch-auction-frontend/.env');

// Function to update the .env file
const updateEnvValue = (key, value) => {
  try {
    let envConfig = {};
    if (fs.existsSync(envFilePath)) {
      envConfig = dotenv.parse(fs.readFileSync(envFilePath));
    }
    envConfig[key] = value;
    const updatedEnvConfig = Object.keys(envConfig)
      .map(k => `${k}=${envConfig[k]}`)
      .join('\n');
    fs.writeFileSync(envFilePath, updatedEnvConfig);
    console.log(`Updated ${key} in .env to:`, value);
  } catch (error) {
    console.error('Error updating .env file:', error);
    throw error;
  }
};

// Function to verify contract deployment
const verifyContract = async (address) => {
  try {
    const code = await hre.ethers.provider.getCode(address);
    if (code === '0x') {
      throw new Error(`No contract code found at ${address}`);
    }
    console.log(`Verified contract deployment at ${address}`);
    return true;
  } catch (error) {
    console.error('Contract verification failed:', error);
    throw error;
  }
};

// Function to setup token for auction
const setupTokenForAuction = async (token, auctionAddress, amount) => {
  try {
    // Approve auction contract to spend tokens
    const tx = await token.approve(auctionAddress, amount);
    await tx.wait();
    console.log(`Approved auction contract to spend ${amount} tokens`);

    // Transfer tokens to auction contract
    const transferTx = await token.transfer(auctionAddress, amount);
    await transferTx.wait();
    console.log(`Transferred ${amount} tokens to auction contract`);
  } catch (error) {
    console.error('Error setting up tokens for auction:', error);
    throw error;
  }
};

async function main() {
  try {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

    // Deploy ERC20Token
    const ERC20Token = await hre.ethers.getContractFactory("ERC20Token");
    const initialSupply = hre.ethers.parseUnits("1000", 18); // 1000 tokens
    const erc20Token = await ERC20Token.deploy(initialSupply, deployer.address);
    await erc20Token.waitForDeployment();
    const tokenAddress = await erc20Token.getAddress();
    console.log("ERC20Token deployed to:", tokenAddress);
    await verifyContract(tokenAddress);

    // Deploy Bidder contract
    const Bidder = await hre.ethers.getContractFactory("Bidder");
    const bidder = await Bidder.deploy();
    await bidder.waitForDeployment();
    const bidderAddress = await bidder.getAddress();
    console.log("Bidder contract deployed to:", bidderAddress);
    await verifyContract(bidderAddress);

    // Deploy DutchAuction contract
    const DutchAuction = await hre.ethers.getContractFactory("DutchAuction");
    const startPrice = hre.ethers.parseEther("1"); // 1 ETH
    const reservePrice = hre.ethers.parseEther("0.1"); // 0.1 ETH
    const auctionDuration = 1200;
    const totalTokens = hre.ethers.parseUnits("10", 18); // 10 tokens
    const priceDecrement = hre.ethers.parseEther("0.05"); // 0.05 ETH per minute

    const dutchAuction = await DutchAuction.deploy(
      tokenAddress,
      bidderAddress,
      startPrice,
      reservePrice,
      auctionDuration,
      totalTokens,
      priceDecrement
    );
    
    await dutchAuction.waitForDeployment();
    const dutchAuctionAddress = await dutchAuction.getAddress();
    console.log("DutchAuction contract deployed to:", dutchAuctionAddress);
    await verifyContract(dutchAuctionAddress);

    // Setup tokens for auction
    await setupTokenForAuction(erc20Token, dutchAuctionAddress, totalTokens);

    // Update .env file with contract addresses
    updateEnvValue('REACT_APP_CONTRACT_ADDRESS', dutchAuctionAddress);
    updateEnvValue('REACT_APP_TOKEN_ADDRESS', tokenAddress);
    updateEnvValue('REACT_APP_BIDDER_ADDRESS', bidderAddress);

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
    console.error("Deployment failed:", error);
    throw error;
  }
}

// Execute the script
main()
  .then(() => {
    console.log("Deployment completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });