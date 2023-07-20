import { HardhatUserConfig, task } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import '@nomiclabs/hardhat-ethers';
import BigNumber from 'bignumber.js';

function getAccounts(networkName: string) {
  const { parsed } = require('dotenv').config({ path: `.env.${networkName}` });
  let MNEMONIC;
  if (parsed) {
    MNEMONIC = parsed.MNEMONIC.split(',');
  }
  return MNEMONIC;
}
task('accounts', 'Prints the list of accounts', async () => {
  const accounts = await ethers.getSigners();
  for (const account of accounts) {
    const balance = await ethers.provider.getBalance(account.address);
    console.log(account.address, ethers.utils.formatEther(balance), 'ETH');
  }
});
task('gasPrice', 'Prints gas price of chain', async () => {
  const FeeData = await ethers.provider.getFeeData();
  console.log({ gasPrice: new BigNumber(FeeData.gasPrice.toString()).div(1e9).toFixed(3) + ' GWEI' });
});
task('balance', "Prints an account's balance")
  .addParam('account', "The account's address")
  .setAction(async (taskArgs) => {
    const balance = await ethers.provider.getBalance(taskArgs.account);
    console.log(ethers.utils.formatEther(balance), 'ETH', balance.toString());
  });
task('nonce', 'Prints the list of accounts', async () => {
  const accounts = await ethers.getSigners();
  for (const account of accounts) {
    const nonce = await ethers.provider.getTransactionCount(account.address);
    console.log(account.address, nonce);
  }
});
const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.13',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      forking: {
        // blockNumber: 29874110,
        url: 'https://goerli.infura.io/v3/56c5a245c16f4fe392b078a69e004a0b',
        // url: 'https://polygon-mumbai.blockpi.network/v1/rpc/public',
      },
    },
    mumbai: {
      url: 'https://polygon-mumbai.blockpi.network/v1/rpc/public	',
      accounts: getAccounts('mumbai'),
      chainId: 80001,
      // gasPrice: utils.parseUnits('4', 'gwei').toNumber(),
    },
    sepolia: {
      url: 'https://rpc.sepolia.org',
      accounts: getAccounts('sepolia'),
      chainId: 11155111,
      // gasPrice: utils.parseUnits('1', 'gwei').toNumber(),
    },
    development: {
      url: 'http://127.0.0.1:7545',
      // accounts: getAccounts('scroll'),
    },
  },
};
export default config;
