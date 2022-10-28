const NftMarket = artifacts.require('NftMarket');
const Helper = artifacts.require('Helper');
const Tool = require('../scriptSource/Tool');
let contracts = Tool.getContracts();
module.exports = async function (deployer,network) {
    let helper = await Helper.at(contracts.Helper);
    await deployer.link(helper,NftMarket);
    await deployer.deploy(NftMarket);
    contracts.Logic_NftMarket = NftMarket.address;
    await Tool.saveContracts(contracts,network);
};
