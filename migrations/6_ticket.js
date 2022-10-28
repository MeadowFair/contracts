const Ticket = artifacts.require('Ticket');
const Proxy = artifacts.require('TransparentUpgradeableProxy');
const Tool = require('../scriptSource/Tool');
let contracts = Tool.getContracts();
let config = Tool.getConfig();
module.exports = async function (deployer,network) {
    let instance = await Ticket.deployed();
    let data = instance.contract.methods.initialize(config.uri, config.owner).encodeABI();
    await deployer.deploy(Proxy, contracts.Logic_Ticket, contracts.ProxyAdmin, data);
    contracts.Ticket = Proxy.address;
    await Tool.saveContracts(contracts,network);
};
