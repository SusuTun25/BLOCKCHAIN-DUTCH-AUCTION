import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getContract, addTokenToMetaMask} from '../utils/ethereum';
import DutchAuctionFactory from '../abis/DutchAuctionFactory.json'; 
import TokenFactory from '../abis/TokenFactory.json';
import Token from '../abis/Token.json';
import { useAuctionContext } from '../components/AuctionContext';

const CreateAuction = () => {
    // State for token creation
    const [tokenName, setTokenName] = useState('');
    const [tokenTicker, setTokenTicker] = useState('');
    const [initialSupply, setInitialSupply] = useState('');
    
    // State for auction creation
    const [tokenAddress, setTokenAddress] = useState(''); // To hold the token address after creation
    const [tokenQty, setTokenQty] = useState('');
    const [startingPrice, setStartingPrice] = useState('');
    const [discountRate, setDiscountRate] = useState('');

    const { setAuctionAddress, setTokenAdd } = useAuctionContext();

    const switchNetwork = async () => {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x539' }], // Ganache chain ID (5777) in hexadecimal
            });
        } catch (error) {
            // Handle error or show a message
            if (error.code === 4902) {
                // This error code indicates that the network is not added to MetaMask
                alert("Please add the Ganache network to MetaMask.");
            } else {
                console.error('Failed to switch network:', error);
            }
        }
    };
    
    const tokenFactoryAddress = process.env.REACT_APP_TOKEN_FACTORY_ADDRESS; 
    const auctionFactoryAddress = process.env.REACT_APP_DUTCH_AUCTION_FACTORY_ADDRESS; 

    const deployToken = async () => {
        await switchNetwork(); 
        if (!tokenName || !tokenTicker || !initialSupply) {
            alert('Please fill in all token fields.');
            return;
        }
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const tokenFactoryContract = getContract(tokenFactoryAddress, TokenFactory.abi , signer);

        try {
            const tx = await tokenFactoryContract.deployToken(tokenName, tokenTicker, ethers.parseUnits(initialSupply, 18));
            const receipt = await tx.wait(); // Wait for the transaction to be mined

            console.log(receipt.logs[2])
            console.log(receipt.logs[2].args[0])
            // Find the token address from the logs
            const tokenLog = receipt.logs[2].args[0];
            
            if (tokenLog) {
                const tokenAdd = tokenLog; // Assuming tokenAddress is the correct parameter name
                setTokenAddress(tokenAdd); // Store the token address
                setTokenAdd(tokenAdd)
                addTokenToMetaMask(tokenAdd, tokenTicker); // Add the token to MetaMask
                alert('Token deployed successfully!');
            } else {
                alert('Token deployment event not found in logs.');
            }
            // Now create the auction
            await createAuction(tokenAddress);
        } catch (error) {
            console.error(error);
            alert('Token deployment failed. Check console for details.');
        }
    };

    const createAuction = async (tokenAddress) => {
        if (!tokenQty || !startingPrice || !discountRate) {
            alert('Please fill in all auction fields.');
            return;
        }

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        const auctionContract = getContract(auctionFactoryAddress, DutchAuctionFactory.abi, signer);
        try {
            const tx = await auctionContract.deployAuction(
                tokenAddress,  // Use the newly created token address
                tokenQty,
                ethers.parseUnits(startingPrice, 18), 
                ethers.parseUnits(discountRate, 18)    
            );
            await tx.wait(); // Wait for the transaction to be mined
            //const txLogs = decodeTransctionLogs(DutchAuctionFactory, tx.logs);
            console.log(tx);
            // console.log(tx.topics[1]);
            // const address = tx.topics[1] ;
            const contract = new ethers.Contract(tokenAddress, Token.abi, signer);
            const approveTx = await contract.approve(tx.to, tokenQty);
            await approveTx.wait();
            setAuctionAddress(tokenAddress);
            alert('Auction created successfully!');
        } catch (error) {
            console.error(error);
            alert('Auction creation failed. Check console for details.');
        }
    };

    return (
        <div>
            <h1>Create Token and Auction</h1>

            {/* Token Creation Form */}
            <h2>Deploy ERC20 Token</h2>
            <input type="text" placeholder="Token Name" value={tokenName} onChange={(e) => setTokenName(e.target.value)} />
            <input type="text" placeholder="Token Ticker" value={tokenTicker} onChange={(e) => setTokenTicker(e.target.value)} />
            <input type="number" placeholder="Initial Supply" value={initialSupply} onChange={(e) => setInitialSupply(e.target.value)} />
            <button onClick={deployToken}>Deploy Token</button>

            {/* Auction Creation Form */}
            {tokenAddress && (
                <>
                    <h2>Create Auction for {tokenTicker}</h2>
                    <div>
                        <label>Token Address:</label>
                        <input type="text" value={tokenAddress} readOnly />
                    </div>
                    <input type="number" placeholder="Token Quantity" value={tokenQty} onChange={(e) => setTokenQty(e.target.value)} />
                    <input type="text" placeholder="Starting Price (in ETH)" value={startingPrice} onChange={(e) => setStartingPrice(e.target.value)} />
                    <input type="text" placeholder="Discount Rate (in ETH)" value={discountRate} onChange={(e) => setDiscountRate(e.target.value)} />
                    <button onClick={() => createAuction(tokenAddress)}>Create Auction</button>
                </>
            )}
        </div>
    );
};

export default CreateAuction;
