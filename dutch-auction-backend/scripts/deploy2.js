const hre = require("hardhat");
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const envFilePath = path.resolve(__dirname, '../../dutch-auction-frontend/.env');


// Function to update the .env file
const updateEnvValue = (key, value) => {
    const envConfig = dotenv.parse(fs.readFileSync(envFilePath));
    envConfig[key] = value;
    const updatedEnvConfig = Object.keys(envConfig)
      .map(k => `${k}=${envConfig[k]}`)
      .join('\n');
    fs.writeFileSync(envFilePath, updatedEnvConfig);
  };  

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Deploy ERC20Token
    const ERC20Token = await hre.ethers.getContractFactory("ERC20Token");
    const initialSupply = 10; // 1 million tokens
    const erc20Token = await ERC20Token.deploy(initialSupply, deployer.address);
    await erc20Token.waitForDeployment();
    console.log("ERC20Token deployed to:", await erc20Token.getAddress());

    // Check if the token contract was deployed correctly
    // if (!erc20Token.address) {
    //     console.error("ERC20Token address is undefined after deployment");
    //     return;
    // }
    // Deploy the Bidder contract
    const Bidder = await hre.ethers.getContractFactory("Bidder");
    const bidder = await Bidder.deploy();
    await bidder.waitForDeployment();
    const bidderAddress = await bidder.getAddress();
    console.log("Bidder contract deployed to:", bidderAddress);

    // Deploy the DutchAuction contract, passing in ERC20Token and Bidder addresses
    const DutchAuction = await hre.ethers.getContractFactory("DutchAuction");
    const startPrice = hre.ethers.parseEther("1"); // 1 ETH
    const reservePrice = hre.ethers.parseEther("0.1"); // 0.1 ETH
    const auctionDuration = 120; // Auction duration in seconds (1 hour)
    const totalTokens = hre.ethers.parseUnits("10", 18); // 100 tokens
    const priceDecrement = hre.ethers.parseEther("0.05"); // Price decreases by 0.05 ETH per minute

    const dutchAuction = await DutchAuction.deploy(
        erc20Token.getAddress(),        // Address of ERC20 token
        bidderAddress,            // Address of Bidder contract
        startPrice,
        reservePrice,
        auctionDuration,
        totalTokens,
        priceDecrement
    );
    
    await dutchAuction.waitForDeployment();
    const dutchAuctionAddress = await dutchAuction.getAddress();
    console.log("DutchAuction contract deployed to:", dutchAuctionAddress);

    // Update .env file with Dutch_Auction address
    updateEnvValue('REACT_APP_CONTRACT_ADDRESS', dutchAuctionAddress);

    // Optionally, start the auction after deployment
    const tx = await dutchAuction.startAuction();
    await tx.wait();
    console.log("Auction started successfully");
}

// Execute the script with error handling
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error deploying contracts:", error);
    process.exit(1);
  });
