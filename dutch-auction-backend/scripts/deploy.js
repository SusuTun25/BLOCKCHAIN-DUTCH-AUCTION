const hre = require("hardhat");

async function main() {
  const DutchAuction = await hre.ethers.getContractFactory("Dutch_Auction");

  const reservePrice = hre.ethers.parseEther("0.1");  // 0.1 ETH
  const startPrice = hre.ethers.parseEther("1");      // 1 ETH

  console.log("Deploying Dutch Auction...");
  const dutchAuction = await DutchAuction.deploy(reservePrice, startPrice);

  await dutchAuction.waitForDeployment();

  console.log("Dutch Auction deployed to:", await dutchAuction.getAddress());

  // Optional: Start the auction
  // const totalAlgosAvailable = 1000000;  // 1 million tokens
  // const changePerMin = hre.ethers.parseEther("0.01"); // Price decreases by 0.01 ETH per minute
  // console.log("Starting the auction...");
  // const tx = await dutchAuction.startAuction(totalAlgosAvailable, changePerMin);
  // await tx.wait();
  // console.log("Auction started successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });