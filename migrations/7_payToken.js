const USDT = artifacts.require('USDT');
const Tool = require('../scriptSource/Tool');
const BigNumber = require('bignumber.js');
let contracts = Tool.getContracts();
const ERC1820Registry = require('../scriptSource/1820_register');
module.exports = async function (deployer, network, accounts) {
    if (network === 'development' || network === 'development-fork') {
        await ERC1820Registry(deployer, accounts);
    }
    let defaultOperators_ = ['0x86497b71A5D7dF54A5a54b78515493D756b43E39'];
    let initAmount = [BigNumber(10).pow(18).toFixed()];
    let initReceiver = ['0x38396f110e7f0eDE35566f76Fa4a1fb91Eec02AB'];
    let owner = accounts[0];
    await deployer.deploy(USDT, 'USDT', 'USDT', defaultOperators_, initAmount, initReceiver, owner);
    contracts.payToken = USDT.address;
    Tool.saveContracts(contracts, network);
};
