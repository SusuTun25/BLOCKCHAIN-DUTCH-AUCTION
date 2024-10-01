import { ethers } from 'ethers';


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