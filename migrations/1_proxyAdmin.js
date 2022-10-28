const ProxyAdmin = artifacts.require('ProxyAdmin');
const Tool = require('../scriptSource/Tool');
let contracts = Tool.getContracts();
module.exports = async function (deployer,network) {
    await deployer.deploy(ProxyAdmin);
    contracts.ProxyAdmin = ProxyAdmin.address;
    await Tool.saveContracts(contracts,network);
};
