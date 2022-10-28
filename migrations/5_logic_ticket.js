const Ticket = artifacts.require('Ticket');
const Tool = require('../scriptSource/Tool');
let contracts = Tool.getContracts();
module.exports = async function (deployer,network) {
    await deployer.deploy(Ticket);
    contracts.Logic_Ticket = Ticket.address;
    await Tool.saveContracts(contracts,network);
};
