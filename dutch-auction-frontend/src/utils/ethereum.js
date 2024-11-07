import { ethers } from 'ethers';

// Supported networks configuration
const SUPPORTED_NETWORKS = {
  31337: {
    name: 'Hardhat Local',
    rpcUrl: 'http://127.0.0.1:8545',
  },
  
};

export const connectMetaMask = async () => {
  if (typeof window.ethereum === 'undefined') {
    throw new Error("Please install MetaMask to use this application");
  }

  try {
    // Get all accounts
    const accounts = await window.ethereum.request({ 
      method: 'eth_requestAccounts' 
    });

    if (accounts.length === 0) {
      throw new Error("No accounts found. Please create an account in MetaMask.");
    }

    // Get current network
    const chainId = await window.ethereum.request({ 
      method: 'eth_chainId' 
    });
    
    const currentChainId = parseInt(chainId, 16);

    // Check if network is supported
    if (!SUPPORTED_NETWORKS[currentChainId]) {
      // If not on supported network, prompt to switch
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x7A69' }], // 31337 in hex for Hardhat
        });
      } catch (switchError) {
        // Handle chain not added to MetaMask
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x7A69', // 31337 in hex
              chainName: 'Hardhat Local',
              nativeCurrency: {
                name: 'ETH',
                symbol: 'ETH',
                decimals: 18
              },
              rpcUrls: ['http://127.0.0.1:8545'],
            }]
          });
        } else {
          throw switchError;
        }
      }
    }

    // Initialize provider and signer
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();

    return { 
      provider,
      signer, 
      address,
      chainId: currentChainId
    };
  } catch (error) {
    console.error("Error in connectMetaMask:", error);
    throw error;
  }
};

export const getContract = (address, abi, signer) => {
  try {
    if (!address || !abi || !signer) {
      throw new Error("Missing parameters for contract initialization");
    }
    return new ethers.Contract(address, abi, signer);
  } catch (error) {
    console.error("Error in getContract:", error);
    throw error;
  }
};

// Enhanced event listeners with automatic reconnection
export const setupAccountListener = (onAccountChange, onDisconnect) => {
  if (!window.ethereum) return;

  const handleAccountsChanged = async (accounts) => {
    if (accounts.length === 0) {
      // Handle disconnection
      onDisconnect?.();
    } else {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        onAccountChange?.(address, signer);
      } catch (error) {
        console.error("Error handling account change:", error);
        onDisconnect?.();
      }
    }
  };

  window.ethereum.on('accountsChanged', handleAccountsChanged);
  return () => window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
};

export const setupNetworkListener = (onNetworkChange, onUnsupportedNetwork) => {
  if (!window.ethereum) return;

  const handleChainChanged = async (chainIdHex) => {
    const chainId = parseInt(chainIdHex, 16);
    
    if (SUPPORTED_NETWORKS[chainId]) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();
        onNetworkChange?.(chainId, network.name);
      } catch (error) {
        console.error("Error handling network change:", error);
      }
    } else {
      onUnsupportedNetwork?.(chainId);
    }
  };

  window.ethereum.on('chainChanged', handleChainChanged);
  return () => window.ethereum.removeListener('chainChanged', handleChainChanged);
};

// Utility function to check if connected to correct network
export const verifyNetwork = async () => {
  const chainId = await window.ethereum.request({ 
    method: 'eth_chainId' 
  });
  
  const currentChainId = parseInt(chainId, 16);
  return SUPPORTED_NETWORKS[currentChainId] !== undefined;
};

// Utility function to get all accounts and allow user to switch
export const switchAccount = async () => {
  try {
    await window.ethereum.request({
      method: 'wallet_requestPermissions',
      params: [{ eth_accounts: {} }]
    });
    
    const accounts = await window.ethereum.request({ 
      method: 'eth_requestAccounts' 
    });
    
    return accounts[0];
  } catch (error) {
    console.error("Error switching account:", error);
    throw error;
  }
};

// Utility function to manually switch networks
export const switchNetwork = async (chainId) => {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${chainId.toString(16)}` }]
    });
    return true;
  } catch (error) {
    console.error("Error switching network:", error);
    throw error;
  }
};