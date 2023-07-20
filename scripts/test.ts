import { ethers, network } from 'hardhat';
const networkName = network.name;
import { Tool } from './Tool';
import BigNumber from 'bignumber.js';
const { constants } = ethers;
async function main() {
  let tx;
  const contracts = Tool.getContracts();
  console.log(contracts.NftMarket);
  const NftMarket = await ethers.getContractFactory('NftMarket', {
    libraries: {
      Helper: contracts.Helper,
    },
  });
  const market = NftMarket.attach(contracts.NftMarket);
  console.log(Tool.filterFields(await market.makerOrders('0xD38cBB0d33a1f5275180961A44ca1610A9c37C7f', 5, '0xb7A9DEd5D6621a596A53D88531a3e1c23ceEA555')));
  return;
  const user = await ethers.getImpersonatedSigner('0xb7A9DEd5D6621a596A53D88531a3e1c23ceEA555');
  tx = await market
    .connect(user)
    .make(
      '0xD38cBB0d33a1f5275180961A44ca1610A9c37C7f',
      5,
      1690473600,
      '0x0000000000000000000000000000000000000000',
      '4000000000000000',
      2,
      '0x0000000000000000000000000000000000000000000000000000000000000001',
      true,
      {
        value: 0,
      }
    );
  await Tool.printReceipt(tx);
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
