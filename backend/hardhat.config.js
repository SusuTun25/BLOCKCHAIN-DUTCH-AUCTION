require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.27",
  networks: {
    hardhat: {
      chainId: 1377
    },
    ganache: {
      url: "http://127.0.0.1:7545",
      chainId: 1337,
      accounts: [
        "0xb7812917ddcaa13c539b5cf4e940361c78c08e3a3adbd8ee6fa45ee8f6d1bfed",
        "0xb02a94ab1237d6e3289efcee6a363921196a2f04fdc10837a13ea73d35329fae",
        "0xf374d065cb7d68f5227fd17445629220f5d59fa6097e0a41fcc709712c514f1b",
        "0x8c09d4e54375351bc96b1417da9c614525a3175898b33fb6465ee9b054a0b4d3",
        "0xeef80ffcfc75e7a211dc769930d5d615308b4b079444bbe67ac63be063143752"
      ]
    }
  }
};
