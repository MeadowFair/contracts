const NftMarket = artifacts.require('NftMarket');
const Proxy = artifacts.require('TransparentUpgradeableProxy');
const Tool = require('../scriptSource/Tool');
let contracts = Tool.getContracts();
let config = Tool.getConfig();
module.exports = async function (deployer, network) {
    let instance = await NftMarket.deployed();
    let data = instance.contract.methods.initialize(config.owner, config.feeReceiver).encodeABI();
    await deployer.deploy(Proxy, contracts.Logic_NftMarket, contracts.ProxyAdmin, data);
    contracts.NftMarket = Proxy.address;
    await Tool.saveContracts(contracts, network);
};
