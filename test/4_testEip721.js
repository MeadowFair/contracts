const NftMarket = artifacts.require('NftMarket');
const Eip721 = artifacts.require('Eip721');
const BigNumber = require('bignumber.js');
const USDT = artifacts.require('USDT');
const { constants } = require('ethers');
const Tool = require('../scriptSource/Tool');
let contracts = Tool.getContracts();
contract('testEip721', function (accounts) {
    it('eip721-usdt-make&take', async function () {
        let ticket = await Eip721.new('ticket', 'ticket');
        let usdt = await USDT.at(contracts.payToken);
        let market = await NftMarket.at(contracts.NftMarket);
        await ticket.mint(accounts[0], 1);
        await ticket.setApprovalForAll(contracts.NftMarket, true);
        await usdt.operatorMint(accounts[1], BigNumber(100).multipliedBy(1e18).toFixed(0), Buffer.from(''), Buffer.from(''));
        await usdt.approve(contracts.NftMarket, constants.MaxUint256, {
            from: accounts[1],
        });
        await market.setAllowToken(contracts.payToken, true);
        let creatorEarningsRate = 200;
        let feeRate = 500;
        await market.setNftInfo(ticket.address, false, accounts[2], feeRate, creatorEarningsRate);
        let _token = ticket.address;
        let _tokenId = 1;
        let _endTime = Date.now() + 86400;
        let _payToken = contracts.payToken;
        let _price = BigNumber(50).multipliedBy(1e18).toFixed(0);
        /// @param _type 0:EIP-721,EIP-3525 OR EIP-4907 sale; 1:EIP-4907 rental; 2:EIP-1155;
        /// 3:EIP-5187 sale; 4:EIP-5187 rental; 5:EIP-5187 sublet;
        let _type = 0;
        let _data = Buffer.from('');
        let _isProvideNft = true;
        const orderId = 1;
        await market.make(_token, _tokenId, _endTime, _payToken, _price, _type, _data, _isProvideNft);
        let taker_balance1 = await usdt.balanceOf(accounts[1]);
        let maker_balance1 = await usdt.balanceOf(accounts[0]);
        await market.take(orderId, {
            from: accounts[1],
        });
        assert.equal(await ticket.ownerOf(_tokenId), accounts[1], 'nft owner error');
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
        await market.creatorEaringWithdraw(_token, contracts.payToken, {
            from: accounts[2],
        });
        let creator_balance2 = await usdt.balanceOf(accounts[2]);
        let actual_creator2 = BigNumber(creator_balance2.toString()).minus(creator_balance1.toString()).toFixed(0);
        assert.equal(actual_creator2, cal_creator, 'creator amount error');
    });
    it('eip721-usdt-make&offer', async function () {
        let ticket = await Eip721.new('ticket', 'ticket');
        let usdt = await USDT.at(contracts.payToken);
        let market = await NftMarket.at(contracts.NftMarket);
        await ticket.mint(accounts[0], 1);
        await ticket.setApprovalForAll(contracts.NftMarket, true);
        await usdt.operatorMint(accounts[1], BigNumber(100).multipliedBy(1e18).toFixed(0), Buffer.from(''), Buffer.from(''));
        let creatorEarningsRate = 200;
        let feeRate = 700;
        await market.setNftInfo(ticket.address, false, accounts[2], feeRate, creatorEarningsRate);
        let _token = ticket.address;
        let _tokenId = 1;
        let _endTime = Date.now() + 86400;
        let _payToken = contracts.payToken;
        let _price = BigNumber(100).multipliedBy(1e18).toFixed(0);
        /// @param _type 0:EIP-721,EIP-3525 OR EIP-4907 sale; 1:EIP-4907 rental; 2:EIP-1155;
        /// 3:EIP-5187 sale; 4:EIP-5187 rental; 5:EIP-5187 sublet;
        let _type = 0;
        let _data = Buffer.from('');
        let _isProvideNft = true;
        const orderId = 2;
        await market.make(_token, _tokenId, _endTime, _payToken, _price, _type, _data, _isProvideNft);
        let taker_balance1 = await usdt.balanceOf(accounts[1]);
        await market.offer(orderId, [BigNumber(50).multipliedBy(1e18).toFixed(0), Date.now() + 200], {
            from: accounts[1],
        });
        _price = BigNumber(50).multipliedBy(1e18).toFixed(0);
        let maker_balance1 = await usdt.balanceOf(accounts[0]);
        let before_platform = (await market.platformFee(contracts.payToken)).toString();
        let before_creator = (await market.creatorEarning(_token, contracts.payToken)).toString();
        await market.offerAccept(accounts[1], orderId);
        assert.equal(await ticket.ownerOf(_tokenId), accounts[1], 'nft owner error');
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
        let cal_platform = BigNumber(_price).multipliedBy(feeRate).dividedBy(10000).plus(before_platform).toFixed(0);
        assert.equal(actual_platform, cal_platform, 'platform amount error');
        let actual_creator = (await market.creatorEarning(_token, contracts.payToken)).toString();
        let cal_creator = BigNumber(_price).multipliedBy(creatorEarningsRate).dividedBy(10000).plus(before_creator).toFixed(0);
        assert.equal(actual_creator, cal_creator, 'creator amount error');
        let creator_balance1 = await usdt.balanceOf(accounts[2]);
        await market.creatorEaringWithdraw(_token, contracts.payToken, {
            from: accounts[2],
        });
        let creator_balance2 = await usdt.balanceOf(accounts[2]);
        let actual_creator2 = BigNumber(creator_balance2.toString()).minus(creator_balance1.toString()).toFixed(0);
        assert.equal(actual_creator2, cal_creator, 'creator amount error');
    });
    it('eip721-usdt-make&take-provideFt', async function () {
        let ticket = await Eip721.new('ticket', 'ticket');
        let usdt = await USDT.at(contracts.payToken);
        let market = await NftMarket.at(contracts.NftMarket);
        await ticket.mint(accounts[0], 1);
        await ticket.setApprovalForAll(contracts.NftMarket, true);
        await usdt.operatorMint(accounts[1], BigNumber(100).multipliedBy(1e18).toFixed(0), Buffer.from(''), Buffer.from(''));
        await usdt.approve(contracts.NftMarket, constants.MaxUint256, {
            from: accounts[1],
        });
        let creatorEarningsRate = 200;
        let feeRate = 500;
        await market.setNftInfo(ticket.address, false, accounts[2], feeRate, creatorEarningsRate);
        let _token = ticket.address;
        let _tokenId = 1;
        let _endTime = Date.now() + 86400;
        let _payToken = contracts.payToken;
        let _price = BigNumber(50).multipliedBy(1e18).toFixed(0);
        /// @param _type 0:EIP-721,EIP-3525 OR EIP-4907 sale; 1:EIP-4907 rental; 2:EIP-1155;
        /// 3:EIP-5187 sale; 4:EIP-5187 rental; 5:EIP-5187 sublet;
        let _type = 0;
        let _data = Buffer.from('');
        let _isProvideNft = false;
        let taker_balance1 = await usdt.balanceOf(accounts[1]);
        let maker_balance1 = await usdt.balanceOf(accounts[0]);
        let before_platform = (await market.platformFee(contracts.payToken)).toString();
        let before_creator = (await market.creatorEarning(_token, contracts.payToken)).toString();
        await market.make(_token, _tokenId, _endTime, _payToken, _price, _type, _data, _isProvideNft, {
            from: accounts[1],
        });
        await market.take(3, {
            from: accounts[0],
        });
        assert.equal(await ticket.ownerOf(_tokenId), accounts[1], 'nft owner error');
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
        let cal_platform = BigNumber(_price).multipliedBy(feeRate).dividedBy(10000).plus(before_platform).toFixed(0);
        assert.equal(actual_platform, cal_platform, 'platform amount error');
        let actual_creator = (await market.creatorEarning(_token, contracts.payToken)).toString();
        let cal_creator = BigNumber(_price).multipliedBy(creatorEarningsRate).dividedBy(10000).plus(before_creator).toFixed(0);
        assert.equal(actual_creator, cal_creator, 'creator amount error');
        let creator_balance1 = await usdt.balanceOf(accounts[2]);
        await market.creatorEaringWithdraw(_token, contracts.payToken, {
            from: accounts[2],
        });
        let creator_balance2 = await usdt.balanceOf(accounts[2]);
        let actual_creator2 = BigNumber(creator_balance2.toString()).minus(creator_balance1.toString()).toFixed(0);
        assert.equal(actual_creator2, cal_creator, 'creator amount error');
    });
});
