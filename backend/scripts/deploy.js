// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);

    const DutchAuctionFactory = await hre.ethers.getContractFactory(
      "DutchAuctionFactory",
    );
    const TokenFactory = await hre.ethers.getContractFactory("TokenFactory");
    const dutchAuctionFactory = await DutchAuctionFactory.deploy();
    const tokenFactory = await TokenFactory.deploy();

    await dutchAuctionFactory.waitForDeployment();
    await tokenFactory.waitForDeployment();
    
    const RevealContract = await hre.ethers.getContractFactory("Reveal");
    const deployedReveal = await RevealContract.deploy();
    await deployedReveal.waitForDeployment();

    const BidderFactory = await hre.ethers.getContractFactory("BidderFactory");
    const deployedBidFactory = await BidderFactory.deploy(deployedReveal.target);
    await deployedBidFactory.waitForDeployment();

    dutchAuctionAddress = dutchAuctionFactory.target;
    tokenAddress = tokenFactory.target;
    bidFactoryAddress = deployedBidFactory.target;
    revealAddress = deployedReveal.target;

    console.log("DutchAuctionFactory deployed at:", dutchAuctionAddress);
    console.log("TokenFactory deployed at:", tokenAddress);
    console.log("BidderFactory deployed at:", bidFactoryAddress);
    console.log("Reveal deployed at:", revealAddress);

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });