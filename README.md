# BLOCKCHAIN-DUTCH-AUCTION

## Deployment Guide

### Prerequisites

Before deploying the project, ensure you have the following installed:

- Node.js (v14 or later)
- npm (v6 or later)
- Hardhat
- MetaMask (for interacting with the frontend)

### Backend Deployment

1. **Clone the repository:**
   ```sh
   git clone https://github.com/your-repo/blockchain-dutch-auction.git
   cd blockchain-dutch-auction/dutch-auction-backend
2. **Install Dependencies**
    ```sh
    npm install
3. **Compile the contracts:**
    ```sh
    npx hardhat compile
4. **Deploy the contracts:**
    ```sh
    npx hardhat run scripts/deploy2.js --network localhost

This script will deploy the ERC20 token, Bidder, and Dutch Auction contracts, and update the frontend .env file with the deployed contract addresses.

### Frontend Deployment

1. **Navigate to the frontend directory:**

   ```sh
   cd ../dutch-auction-frontend
2. **Install Dependencies**
    ```sh
    npm install
3. **Configure environment variables:**
    Ensure the .env file in the dutch-auction-frontend directory is updated with the deployed contract addresses. This should have been done automatically by the deployment script.
4. **Start the development server**
     ```sh
     npm start
     ```

### Setup Metamask

1. **Install MetaMask:**

   If you haven't already, install the MetaMask extension for your browser from [MetaMask](https://metamask.io/).

2. **Add Localhost Network:** [Optional as our frontend will do it for you]

   Open MetaMask and click on the network dropdown at the top. Select "Add Network" and fill in the following details:

   - **Network Name:** Hardhat Localhost
   - **New RPC URL:** http://127.0.0.1:8545
   - **Chain ID:** 31337
   - **Currency Symbol:** ETH

   Click "Save" to add the network.

3. **Import Hardhat Accounts:**

   Hardhat provides pre-funded accounts for local development. To import these accounts into MetaMask:

   - Open the `dutch-auction-backend` directory and locate the `hardhat.config.js` file.
   - Start the Hardhat node by running:
     ```sh
     npx hardhat node
     ```
   - You will see a list of accounts with their private keys. Copy the private key of the account you want to import.
   - In MetaMask, click on the account icon at the top right and select "Import Account".
   - Paste the copied private key and click "Import".

   Repeat this process for as many accounts as you need.

4. **Import Deployed Token Contract:**

   After deploying the contracts, you can import the deployed token contract into MetaMask:

   - In MetaMask, click on the "Assets" tab.
   - Scroll down and click on "Import tokens".
   - In the "Token Contract Address" field, enter the address of the deployed ERC20 token contract. You can find this address in the deployment logs or in the `.env` file of the frontend directory.
   - MetaMask should automatically fill in the "Token Symbol" and "Decimals of Precision" fields. If not, enter the appropriate values.
   - Click "Add Custom Token" and then "Import Tokens".

5. **Connect MetaMask to the Application:**

   - Open [http://localhost:3000] in your browser.
   - Click on "Connect Wallet" in the application and select MetaMask. Ensure you are connected to the "Hardhat Localhost" network.

You are now ready to interact with the deployed contracts using MetaMask.
