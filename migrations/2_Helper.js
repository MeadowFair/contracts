const Helper = artifacts.require('Helper');
const Tool = require('../scriptSource/Tool');
let contracts = Tool.getContracts();
module.exports = async function (deployer,network) {
    await deployer.deploy(Helper);
    contracts.Helper = Helper.address;
    await Tool.saveContracts(contracts,network);
};
