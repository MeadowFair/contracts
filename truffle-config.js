const HDWalletProvider = require('@truffle/hdwallet-provider');
const Tool = require("./scriptSource/Tool.js");
const network = Tool.getNetwork();
let env_path;
if (network) {
  env_path = '.env.' + network;
} else {
  env_path = '.env';
}
const { parsed } = require('dotenv').config({ path: env_path });
let MNEMONIC;
if (parsed) {
  MNEMONIC = parsed.MNEMONIC.split(',');
  const fs = require("fs");
  try {
    fs.readFileSync(__dirname + "/config-" + network + ".json");
  } catch (e) {
    console.error("config file not found:" + __dirname + "/config-" + network + ".json");
    process.exit(1)
  }
  try {
    fs.readFileSync(__dirname + "/contracts-" + network + ".json");
  } catch (e) {
    fs.writeFileSync(__dirname + "/contracts-" + network + ".json",
      "{}");
  }
}
module.exports = {
  plugins: [
    'truffle-contract-size'
  ],
  compilers: {
    solc: {
      version: "0.8.13",
      optimizer: {
        enabled: true,
        runs: 200,
      }
    },
  },
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: '*',
      timeoutBlocks: 200,
    },
    kcctest: {
      // provider: () => new HDWalletProvider(MNEMONIC, 'wss://rpc-ws-testnet.kcc.network'),
      // websockets: true,
      provider: () => new HDWalletProvider(MNEMONIC, 'https://rpc-testnet.kcc.network'),
      network_id: 322,
      networkCheckTimeout: 1000 * 60 * 10,
      timeoutBlocks: 200,
      deploymentPollingInterval: 4000,
    },
  }
}