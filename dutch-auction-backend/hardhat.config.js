require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.27",
  networks: {
    hardhat: {
      chainId: 31337
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337
    }
  },
  namedAccounts: {
    deployer: {
      default: 0
    },
    userOne: {
      default: 1
    },
    userTwo: {
      default: 2
    },
    userThree: {
      default: 3
    }
  }
};