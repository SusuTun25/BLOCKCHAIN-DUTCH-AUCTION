const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy ERC20Token
  const ERC20Token = await hre.ethers.getContractFactory("ERC20Token");
  const initialSupply = 1000000; // 1 million tokens
  const erc20Token = await ERC20Token.deploy(initialSupply, deployer.address);
  await erc20Token.waitForDeployment();
  console.log("ERC20Token deployed to:", await erc20Token.getAddress());

  // Deploy Dutch_Auction
  const DutchAuction = await hre.ethers.getContractFactory("Dutch_Auction");
  const reservePrice = hre.ethers.parseEther("0.1"); // 0.1 ETH
  const startPrice = hre.ethers.parseEther("1");    // 1 ETH
  const dutchAuction = await DutchAuction.deploy(reservePrice, startPrice);
  await dutchAuction.waitForDeployment();
  console.log("Dutch_Auction deployed to:", await dutchAuction.getAddress());

  // Start the auction
  const totalTokens = 1000000; // 1 million tokens
  const priceDecreasePerMin = hre.ethers.parseEther("0.05"); // 0.05 ETH per minute
  await dutchAuction.startAuction(totalTokens, priceDecreasePerMin);
  console.log("Auction started");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });