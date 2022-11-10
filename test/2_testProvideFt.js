const NftMarket = artifacts.require('NftMarket');
const Ticket = artifacts.require('Ticket');
const BigNumber = require('bignumber.js');
const USDT = artifacts.require('USDT');
const { constants } = require('ethers');
const Tool = require('../scriptSource/Tool');
let contracts = Tool.getContracts();
contract('testProvideFt', function (accounts) {
    it('eip5187-eth-make&take-provideFt', async function () {
        let ticket = await Ticket.at(contracts.Ticket);
        let market = await NftMarket.at(contracts.NftMarket);
        await ticket.mint(accounts[0], 1, 10);
        await market.setAllowToken(constants.AddressZero, true);
        let creatorEarningsRate = 100;
        let feeRate = 600;
        await market.setNftInfo(contracts.Ticket, false, accounts[2], 0, creatorEarningsRate);
        let _token = contracts.Ticket;
        let _tokenId = 1;
        let _endTime = parseInt(Date.now()/1000) + 86400;
        let _payToken = constants.AddressZero;
        let _price = BigNumber(0.0001).multipliedBy(1e18).toFixed(0);
        /// @param _type 0:EIP-721,EIP-3525 OR EIP-4907 sale; 1:EIP-4907 rental; 2:EIP-1155;
        /// 3:EIP-5187 sale; 4:EIP-5187 rental; 5:EIP-5187 sublet;
        let _type = 3;
        let _data = Buffer.from('');
        let _isProvideNft = false;
        await ticket.setApprovalForAll(contracts.NftMarket, true);
        await market.make(_token, _tokenId, _endTime, _payToken, _price, _type, _data, _isProvideNft, {
            from: accounts[1],
            value: _price,
        });
        await market.cancel(1, {
            from: accounts[1],
        });
        await market.make(_token, _tokenId, _endTime, _payToken, _price, _type, _data, _isProvideNft, {
            from: accounts[1],
            value: _price,
        });
        // let taker_balance1 = await web3.eth.getBalance(accounts[1]);
        let maker_balance1 = await web3.eth.getBalance(accounts[0]);
        let receipt = await market.take(2, constants.AddressZero, {
            from: accounts[0],
        });
        assert.equal(await ticket.propertyRightOf(_tokenId), accounts[1], 'nft owner error');
        // let taker_balance2 = await web3.eth.getBalance(accounts[1]);
        let maker_balance2 = await web3.eth.getBalance(accounts[0]);
        // let actual_taker_amount = BigNumber(taker_balance1.toString()).minus(taker_balance2.toString()).toFixed(0);
        // assert.equal(actual_taker_amount, _price, 'taker amount error');
        let actual_maker_amount = BigNumber(maker_balance2.toString()).minus(maker_balance1.toString()).toFixed(0);
        let cal_maker_amount = BigNumber(_price)
            .multipliedBy(10000 - creatorEarningsRate - feeRate)
            .dividedBy(10000)
            .minus(BigNumber(receipt.receipt.gasUsed).multipliedBy(200000))
            .toFixed(0);
        assert.equal(actual_maker_amount, cal_maker_amount, 'maker amount error');
        let actual_platform = (await market.platformFee(constants.AddressZero)).toString();
        let cal_platform = BigNumber(_price).multipliedBy(feeRate).dividedBy(10000).toFixed(0);
        assert.equal(actual_platform, cal_platform, 'platform amount error');
        let actual_creator = (await market.creatorEarning(_token, constants.AddressZero)).toString();
        let cal_creator = BigNumber(_price).multipliedBy(creatorEarningsRate).dividedBy(10000).toFixed(0);
        assert.equal(actual_creator, cal_creator, 'creator amount error');
    });
    it('eip5187-usdt-make&take-provideFt', async function () {
        let ticket = await Ticket.at(contracts.Ticket);
        let usdt = await USDT.at(contracts.payToken);
        let market = await NftMarket.at(contracts.NftMarket);
        await ticket.mint(accounts[0], 2, 10);
        await usdt.operatorMint(accounts[1], BigNumber(100).multipliedBy(1e18).toFixed(0), Buffer.from(''), Buffer.from(''));
        await usdt.approve(contracts.NftMarket, constants.MaxUint256, {
            from: accounts[1],
        });
        await market.setAllowToken(contracts.payToken, true);
        let creatorEarningsRate = 200;
        let feeRate = 500;
        await market.setNftInfo(contracts.Ticket, false, accounts[2], feeRate, creatorEarningsRate);
        let _token = contracts.Ticket;
        let _tokenId = 2;
        let _endTime = parseInt(Date.now()/1000) + 86400;
        let _payToken = contracts.payToken;
        let _price = BigNumber(50).multipliedBy(1e18).toFixed(0);
        /// @param _type 0:EIP-721,EIP-3525 OR EIP-4907 sale; 1:EIP-4907 rental; 2:EIP-1155;
        /// 3:EIP-5187 sale; 4:EIP-5187 rental; 5:EIP-5187 sublet;
        let _type = 3;
        let _data = Buffer.from('');
        let _isProvideNft = false;
        let taker_balance1 = await usdt.balanceOf(accounts[1]);
        let maker_balance1 = await usdt.balanceOf(accounts[0]);
        await market.make(_token, _tokenId, _endTime, _payToken, _price, _type, _data, _isProvideNft, {
            from: accounts[1],
        });
        await market.take(3, constants.AddressZero, {
            from: accounts[0],
        });
        assert.equal(await ticket.propertyRightOf(_tokenId), accounts[1], 'nft owner error');
        let taker_balance2 = await usdt.balanceOf(accounts[1]);
        let maker_balance2 = await usdt.balanceOf(accounts[0]);
        let actual_taker_amount = BigNumber(taker_balance1.toString()).minus(taker_balance2.toString()).toFixed(0);
        assert.equal(actual_taker_amount, _price, 'taker amount error');
        let actual_maker_amount = BigNumber(maker_balance2.toString()).minus(maker_balance1.toString()).toFixed(0);
        let cal_maker_amount = BigNumber(_price)
            .multipliedBy(10000 - creatorEarningsRate - feeRate)
            .dividedBy(10000)
            .toFixed(0);
        assert.equal(actual_maker_amount, cal_maker_amount, 'maker amount error');
        let actual_platform = (await market.platformFee(contracts.payToken)).toString();
        let cal_platform = BigNumber(_price).multipliedBy(feeRate).dividedBy(10000).toFixed(0);
        assert.equal(actual_platform, cal_platform, 'platform amount error');
        let actual_creator = (await market.creatorEarning(_token, contracts.payToken)).toString();
        let cal_creator = BigNumber(_price).multipliedBy(creatorEarningsRate).dividedBy(10000).toFixed(0);
        assert.equal(actual_creator, cal_creator, 'creator amount error');
        let creator_balance1 = await usdt.balanceOf(accounts[2]);
        await market.creatorEarningWithdraw(_token, contracts.payToken, {
            from: accounts[2],
        });
        let creator_balance2 = await usdt.balanceOf(accounts[2]);
        let actual_creator2 = BigNumber(creator_balance2.toString()).minus(creator_balance1.toString()).toFixed(0);
        assert.equal(actual_creator2, cal_creator, 'creator amount error');
    });
});
