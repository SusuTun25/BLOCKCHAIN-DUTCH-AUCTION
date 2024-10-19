import { ethers } from 'ethers';
import { Interface } from '@ethersproject/abi';

export const connectMetaMask = async () => {
  if (typeof window.ethereum !== 'undefined') {
    try {
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      return { signer, address };
    } catch (error) {
      console.error("Error connecting to MetaMask:", error);
      return null;
    }
  } else {
    console.log("MetaMask is not installed");
    return null;
  }
};

export const getContract = (address, abi, signer) => {
  return new ethers.Contract(address, abi, signer);
};

export const listenForAccountChanges = (callback) => {
  if (window.ethereum) {
    window.ethereum.on('accountsChanged', (accounts) => callback(accounts[0]));
  }
};

export const listenForNetworkChanges = (callback) => {
  if (window.ethereum) {
    window.ethereum.on('chainChanged', (chainId) => callback(chainId));
  }
};

export const addTokenToMetaMask = async (tokenAddress, tokenSymbol, tokenDecimals) => {
    // Try to add the token to MetaMask
    try {
        await window.ethereum.request({
            method: 'wallet_watchAsset',
            params: {
                type: 'ERC20',
                options: {
                    address: tokenAddress,
                    symbol: tokenSymbol,
                    decimals: tokenDecimals,
                },
            },
        });
        alert('Token added to MetaMask!');
    } catch (error) {
        console.error(error);
        alert('Failed to add token to MetaMask.');
    }
};

export function convertUnixTimeToMinutes(unix_time) {
  const minutes = Math.floor(unix_time / 60);
  const seconds = unix_time % 60;
  return `${minutes}m ${seconds}s`;
}