// timeController.js
const express = require("express");
const { ethers } = require("hardhat"); // Only works in a Hardhat environment

const app = express();
const port = 3001; // You can use any port you prefer

// Endpoint to simulate time passing
app.post("/increase-time", async (req, res) => {
  const { seconds } = req.body;

  try {
    // Increase time by the specified number of seconds
    await ethers.provider.send("evm_increaseTime", [seconds]);
    // Mine a new block to apply the new timestamp
    await ethers.provider.send("evm_mine");

    res.send({ success: true, message: `Increased time by ${seconds} seconds` });
  } catch (error) {
    console.error("Error increasing time:", error);
    res.status(500).send({ success: false, message: "Error increasing time" });
  }
});

app.listen(port, () => {
  console.log(`Time controller server listening on port ${port}`);
});
