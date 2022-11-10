const NftMarket = artifacts.require('NftMarket');
const Ticket = artifacts.require('Ticket');
const BigNumber = require('bignumber.js');
const USDT = artifacts.require('USDT');
const { constants } = require('ethers');
const Tool = require('../scriptSource/Tool');
let contracts = Tool.getContracts();
contract('testEip5187', function (accounts) {
    it('eip5187-profivdeNft-sale', async function () {
        let ticket = await Ticket.at(contracts.Ticket);
        let usdt = await USDT.at(contracts.payToken);
        let market = await NftMarket.at(contracts.NftMarket);
        const _tokenId = 1;
        const orderId = 1;
        await ticket.mint(accounts[0], _tokenId, 10);
        await ticket.setApprovalForAll(contracts.NftMarket, true);
        await usdt.operatorMint(accounts[1], BigNumber(100).multipliedBy(1e18).toFixed(0), Buffer.from(''), Buffer.from(''));
        await usdt.approve(contracts.NftMarket, constants.MaxUint256, {
            from: accounts[1],
        });
        let creatorEarningsRate = 200;
        let feeRate = 700;
        await market.setNftInfo(ticket.address, false, accounts[2], feeRate, creatorEarningsRate);
        await market.setAllowToken(contracts.payToken, true);
        let _token = ticket.address;
        let _endTime = parseInt(Date.now() / 1000) + 86400;
        let _payToken = contracts.payToken;
        let _price = BigNumber(100).multipliedBy(1e18).toFixed(0);
        /// @param _type 0:EIP-721,EIP-3525 OR EIP-4907 sale; 1:EIP-4907 rental; 2:EIP-1155;
        /// 3:EIP-5187 sale; 4:EIP-5187 rental; 5:EIP-5187 sublet;
        let _type = 3;
        let _data = Buffer.from('');
        let _isProvideNft = true;
        await market.make(_token, _tokenId, _endTime, _payToken, _price, _type, _data, _isProvideNft);
        let taker_balance1 = await usdt.balanceOf(accounts[1]);
        let period = 0;
        let transfer_amount = 0;
        await market.offer(orderId, [BigNumber(50).multipliedBy(1e18).toFixed(0), parseInt(Date.now() / 1000) + 200, period, transfer_amount], {
            from: accounts[1],
        });
        _price = BigNumber(50).multipliedBy(1e18).toFixed(0);
        let maker_balance1 = await usdt.balanceOf(accounts[0]);
        let before_platform = (await market.platformFee(contracts.payToken)).toString();
        let before_creator = (await market.creatorEarning(_token, contracts.payToken)).toString();
        await market.offerAccept(accounts[1], orderId);
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
        let cal_platform = BigNumber(_price).multipliedBy(feeRate).dividedBy(10000).plus(before_platform).toFixed(0);
        assert.equal(actual_platform, cal_platform, 'platform amount error');
        let actual_creator = (await market.creatorEarning(_token, contracts.payToken)).toString();
        let cal_creator = BigNumber(_price).multipliedBy(creatorEarningsRate).dividedBy(10000).plus(before_creator).toFixed(0);
        assert.equal(actual_creator, cal_creator, 'creator amount error');
        let creator_balance1 = await usdt.balanceOf(accounts[2]);
        await market.creatorEarningWithdraw(_token, contracts.payToken, {
            from: accounts[2],
        });
        let creator_balance2 = await usdt.balanceOf(accounts[2]);
        let actual_creator2 = BigNumber(creator_balance2.toString()).minus(creator_balance1.toString()).toFixed(0);
        assert.equal(actual_creator2, cal_creator, 'creator amount error');
    });
    it('eip5187-provideFt-sale', async function () {
        let ticket = await Ticket.at(contracts.Ticket);
        let usdt = await USDT.at(contracts.payToken);
        let market = await NftMarket.at(contracts.NftMarket);
        const _tokenId = 2;
        const orderId = 2;
        await ticket.mint(accounts[0], _tokenId, 11);
        await ticket.setApprovalForAll(contracts.NftMarket, true);
        await usdt.operatorMint(accounts[1], BigNumber(100).multipliedBy(1e18).toFixed(0), Buffer.from(''), Buffer.from(''));
        await usdt.approve(contracts.NftMarket, constants.MaxUint256, {
            from: accounts[1],
        });
        let creatorEarningsRate = 200;
        let feeRate = 500;
        await market.setNftInfo(ticket.address, false, accounts[2], feeRate, creatorEarningsRate);
        let _token = ticket.address;
        let _endTime = parseInt(Date.now() / 1000) + 86400;
        let _payToken = contracts.payToken;
        let _price = BigNumber(50).multipliedBy(1e18).toFixed(0);
        /// @param _type 0:EIP-721,EIP-3525 OR EIP-4907 sale; 1:EIP-4907 rental; 2:EIP-1155;
        /// 3:EIP-5187 sale; 4:EIP-5187 rental; 5:EIP-5187 sublet;
        let _type = 3;
        let _data = Buffer.from('');
        let _isProvideNft = false;
        let taker_balance1 = await usdt.balanceOf(accounts[1]);
        let maker_balance1 = await usdt.balanceOf(accounts[0]);
        let before_platform = (await market.platformFee(contracts.payToken)).toString();
        let before_creator = (await market.creatorEarning(_token, contracts.payToken)).toString();
        await market.make(_token, _tokenId, _endTime, _payToken, _price, _type, _data, _isProvideNft, {
            from: accounts[1],
        });
        await market.take(orderId, constants.AddressZero, {
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
        let cal_platform = BigNumber(_price).multipliedBy(feeRate).dividedBy(10000).plus(before_platform).toFixed(0);
        assert.equal(actual_platform, cal_platform, 'platform amount error');
        let actual_creator = (await market.creatorEarning(_token, contracts.payToken)).toString();
        let cal_creator = BigNumber(_price).multipliedBy(creatorEarningsRate).dividedBy(10000).plus(before_creator).toFixed(0);
        assert.equal(actual_creator, cal_creator, 'creator amount error');
        let creator_balance1 = await usdt.balanceOf(accounts[2]);
        await market.creatorEarningWithdraw(_token, contracts.payToken, {
            from: accounts[2],
        });
        let creator_balance2 = await usdt.balanceOf(accounts[2]);
        let actual_creator2 = BigNumber(creator_balance2.toString()).minus(creator_balance1.toString()).toFixed(0);
        assert.equal(actual_creator2, cal_creator, 'creator amount error');
    });

    it('eip5187-profivdeNft-rental', async function () {
        let ticket = await Ticket.at(contracts.Ticket);
        let usdt = await USDT.at(contracts.payToken);
        let market = await NftMarket.at(contracts.NftMarket);
        const _tokenId = 3;
        const orderId = 3;
        await ticket.mint(accounts[0], _tokenId, 10);
        await ticket.setApprovalForAll(contracts.NftMarket, true);
        await usdt.operatorMint(accounts[1], BigNumber(100).multipliedBy(1e18).toFixed(0), Buffer.from(''), Buffer.from(''));
        await usdt.approve(contracts.NftMarket, constants.MaxUint256, {
            from: accounts[1],
        });
        let creatorEarningsRate = 200;
        let feeRate = 700;
        await market.setNftInfo(ticket.address, false, accounts[2], feeRate, creatorEarningsRate);
        let _token = ticket.address;
        let _endTime = parseInt(Date.now() / 1000) + 86400;
        let _payToken = contracts.payToken;
        let _price = BigNumber(100).multipliedBy(1e18).toFixed(0);
        /// @param _type 0:EIP-721,EIP-3525 OR EIP-4907 sale; 1:EIP-4907 rental; 2:EIP-1155;
        /// 3:EIP-5187 sale; 4:EIP-5187 rental; 5:EIP-5187 sublet;
        /// @param _data 1:[_timestamp] 2:[_amount] 4:[_amount,_timestamp] 5:[_amount]
        let _type = 4;
        let _period = 86400;
        let amount = 3;
        let _data = web3.eth.abi.encodeParameters(['uint256', 'uint256'], [amount, _period]);
        let _isProvideNft = true;
        await market.make(_token, _tokenId, _endTime, _payToken, _price, _type, _data, _isProvideNft);
        let taker_balance1 = await usdt.balanceOf(accounts[1]);
        let period = 86400 * 2;
        let transfer_amount = 2;
        await market.offer(orderId, [BigNumber(50).multipliedBy(1e18).toFixed(0), parseInt(Date.now() / 1000) + 200, period, transfer_amount], {
            from: accounts[1],
        });
        _price = BigNumber(50).multipliedBy(1e18).toFixed(0);
        let maker_balance1 = await usdt.balanceOf(accounts[0]);
        let before_platform = (await market.platformFee(contracts.payToken)).toString();
        let before_creator = (await market.creatorEarning(_token, contracts.payToken)).toString();
        const now = parseInt(Date.now() / 1000);
        await market.offerAccept(accounts[1], orderId);
        assert.equal(await ticket.balanceOf(accounts[1], _tokenId), '2', 'nft owner error');
        assert.equal(await ticket.balanceOf(accounts[0], _tokenId), '8', 'nft owner error');
        let ret = BigNumber(Math.abs((await ticket.expireAt(_tokenId, accounts[1])).toNumber() - now - period)).lte(5);
        assert.equal(ret, true, 'nft expire error');
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
        await market.creatorEarningWithdraw(_token, contracts.payToken, {
            from: accounts[2],
        });
        let creator_balance2 = await usdt.balanceOf(accounts[2]);
        let actual_creator2 = BigNumber(creator_balance2.toString()).minus(creator_balance1.toString()).toFixed(0);
        assert.equal(actual_creator2, cal_creator, 'creator amount error');
    });
    it('eip5187-provideFt-rental', async function () {
        let ticket = await Ticket.at(contracts.Ticket);
        let usdt = await USDT.at(contracts.payToken);
        let market = await NftMarket.at(contracts.NftMarket);
        const _tokenId = 3;
        const orderId = 4;
        const toUser = accounts[3];
        // await ticket.mint(accounts[0], _tokenId, 11);
        await ticket.setApprovalForAll(contracts.NftMarket, true);
        await usdt.operatorMint(toUser, BigNumber(100).multipliedBy(1e18).toFixed(0), Buffer.from(''), Buffer.from(''));
        await usdt.approve(contracts.NftMarket, constants.MaxUint256, {
            from: toUser,
        });
        let creatorEarningsRate = 200;
        let feeRate = 500;
        await market.setNftInfo(ticket.address, false, accounts[2], feeRate, creatorEarningsRate);
        let _token = ticket.address;
        let _endTime = parseInt(Date.now() / 1000) + 86400;
        let _payToken = contracts.payToken;
        let _price = BigNumber(50).multipliedBy(1e18).toFixed(0);
        /// @param _type 0:EIP-721,EIP-3525 OR EIP-4907 sale; 1:EIP-4907 rental; 2:EIP-1155;
        /// 3:EIP-5187 sale; 4:EIP-5187 rental; 5:EIP-5187 sublet;
        /// @param _data 1:[_timestamp] 2:[_amount] 4:[_amount,_timestamp] 5:[_amount,_timestamp] 6:[_amount,_timestamp]
        let _type = 4;
        let _period = 86400;
        let _data = web3.eth.abi.encodeParameters(['uint256', 'uint256'], [5, _period]);
        let _isProvideNft = false;
        let taker_balance1 = await usdt.balanceOf(toUser);
        let maker_balance1 = await usdt.balanceOf(accounts[0]);
        let before_platform = (await market.platformFee(contracts.payToken)).toString();
        let before_creator = (await market.creatorEarning(_token, contracts.payToken)).toString();
        await market.make(_token, _tokenId, _endTime, _payToken, _price, _type, _data, _isProvideNft, {
            from: toUser,
        });
        const now = parseInt(Date.now() / 1000);
        await market.take(orderId, constants.AddressZero, {
            from: accounts[0],
        });
        assert.equal((await ticket.balanceOf(toUser, _tokenId)).toString(), '5', 'nft owner error');
        assert.equal((await ticket.balanceOf(accounts[0], _tokenId)).toString(), '3', 'nft owner error');
        const ret = BigNumber(Math.abs((await ticket.expireAt(_tokenId, toUser)).toString() - now - _period)).lte(5);
        assert.equal(ret, true, 'nft expire error');
        let taker_balance2 = await usdt.balanceOf(toUser);
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
        await market.creatorEarningWithdraw(_token, contracts.payToken, {
            from: accounts[2],
        });
        let creator_balance2 = await usdt.balanceOf(accounts[2]);
        let actual_creator2 = BigNumber(creator_balance2.toString()).minus(creator_balance1.toString()).toFixed(0);
        assert.equal(actual_creator2, cal_creator, 'creator amount error');
    });

    it('eip5187-profivdeNft-sublet', async function () {
        let ticket = await Ticket.at(contracts.Ticket);
        let usdt = await USDT.at(contracts.payToken);
        let market = await NftMarket.at(contracts.NftMarket);
        const _tokenId = 4;
        const orderId = 5;
        const _expireAt = parseInt(Date.now() / 1000) + 86400;
        await ticket.mint(accounts[3], _tokenId, 10);
        await ticket.safeRent(accounts[3], accounts[0], _tokenId, 2, _expireAt, {
            from: accounts[3],
        });
        await ticket.setApprovalForAll(contracts.NftMarket, true);
        await usdt.operatorMint(accounts[1], BigNumber(100).multipliedBy(1e18).toFixed(0), Buffer.from(''), Buffer.from(''));
        await usdt.approve(contracts.NftMarket, constants.MaxUint256, {
            from: accounts[1],
        });
        let creatorEarningsRate = 200;
        let feeRate = 700;
        await market.setNftInfo(ticket.address, false, accounts[2], feeRate, creatorEarningsRate);
        let _token = ticket.address;
        let _endTime = parseInt(Date.now() / 1000) + 86400;
        let _payToken = contracts.payToken;
        let _price = BigNumber(100).multipliedBy(1e18).toFixed(0);
        /// @param _type 0:EIP-721,EIP-3525 OR EIP-4907 sale; 1:EIP-4907 rental; 2:EIP-1155;
        /// 3:EIP-5187 sale; 4:EIP-5187 rental; 5:EIP-5187 sublet;
        /// @param _data 1:[_timestamp] 2:[_amount] 4:[_amount,_timestamp] 5:[_amount]
        let _type = 5;
        let _data = web3.eth.abi.encodeParameters(['uint256', 'uint256'], [2, _expireAt]);
        let _isProvideNft = true;
        await market.make(_token, _tokenId, _endTime, _payToken, _price, _type, _data, _isProvideNft);
        let taker_balance1 = await usdt.balanceOf(accounts[1]);
        let period = 0;
        let transfer_amount = 0;
        await market.offer(orderId, [BigNumber(50).multipliedBy(1e18).toFixed(0), parseInt(Date.now() / 1000) + 200, period, transfer_amount], {
            from: accounts[1],
        });
        _price = BigNumber(50).multipliedBy(1e18).toFixed(0);
        let maker_balance1 = await usdt.balanceOf(accounts[0]);
        let before_platform = (await market.platformFee(contracts.payToken)).toString();
        let before_creator = (await market.creatorEarning(_token, contracts.payToken)).toString();
        await market.offerAccept(accounts[1], orderId);
        assert.equal((await ticket.balanceOf(accounts[1], _tokenId)).toString(), '2', 'nft owner error');
        assert.equal((await ticket.balanceOf(accounts[0], _tokenId)).toString(), '0', 'nft owner error');
        assert.equal((await ticket.expireAt(_tokenId, accounts[1])).toString(), _expireAt, 'nft owner error');
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
        await market.creatorEarningWithdraw(_token, contracts.payToken, {
            from: accounts[2],
        });
        let creator_balance2 = await usdt.balanceOf(accounts[2]);
        let actual_creator2 = BigNumber(creator_balance2.toString()).minus(creator_balance1.toString()).toFixed(0);
        assert.equal(actual_creator2, cal_creator, 'creator amount error');
    });
    it('eip5187-provideFt-sublet', async function () {
        let ticket = await Ticket.at(contracts.Ticket);
        let usdt = await USDT.at(contracts.payToken);
        let market = await NftMarket.at(contracts.NftMarket);
        const _tokenId = 5;
        const orderId = 6;
        const toUser = accounts[4];
        const fromUser = accounts[1];
        const _expireAt = parseInt(Date.now() / 1000) + 86400;
        await ticket.mint(accounts[3], _tokenId, 10);
        await ticket.safeRent(accounts[3], fromUser, _tokenId, 5, _expireAt, {
            from: accounts[3],
        });
        await ticket.setApprovalForAll(contracts.NftMarket, true, {
            from: fromUser,
        });
        await usdt.operatorMint(toUser, BigNumber(100).multipliedBy(1e18).toFixed(0), Buffer.from(''), Buffer.from(''));
        await usdt.approve(contracts.NftMarket, constants.MaxUint256, {
            from: toUser,
        });
        let creatorEarningsRate = 200;
        let feeRate = 500;
        await market.setNftInfo(ticket.address, false, accounts[2], feeRate, creatorEarningsRate);
        let _token = ticket.address;
        let _endTime = parseInt(Date.now() / 1000) + 86400;
        let _payToken = contracts.payToken;
        let _price = BigNumber(50).multipliedBy(1e18).toFixed(0);
        /// @param _type 0:EIP-721,EIP-3525 OR EIP-4907 sale; 1:EIP-4907 rental; 2:EIP-1155;
        /// 3:EIP-5187 sale; 4:EIP-5187 rental; 5:EIP-5187 sublet; 6:EIP-renew
        /// @param _data 1:[_timestamp] 2:[_amount] 4:[_amount,_timestamp] 5:[_amount,_timestamp] 6:[_amount,_timestamp]
        let _type = 5;
        let _data = web3.eth.abi.encodeParameters(['uint256', 'uint256'], [5, _expireAt]);
        let _isProvideNft = false;
        let taker_balance1 = await usdt.balanceOf(toUser);
        let maker_balance1 = await usdt.balanceOf(fromUser);
        let before_platform = (await market.platformFee(contracts.payToken)).toString();
        let before_creator = (await market.creatorEarning(_token, contracts.payToken)).toString();
        await market.make(_token, _tokenId, _endTime, _payToken, _price, _type, _data, _isProvideNft, {
            from: toUser,
        });
        await market.take(orderId, constants.AddressZero, {
            from: fromUser,
        });
        assert.equal((await ticket.balanceOf(toUser, _tokenId)).toString(), '5', 'nft owner error');
        assert.equal((await ticket.balanceOf(fromUser, _tokenId)).toString(), '0', 'nft owner error');
        assert.equal((await ticket.expireAt(_tokenId, toUser)).toString(), _expireAt, 'nft owner error');
        let taker_balance2 = await usdt.balanceOf(toUser);
        let maker_balance2 = await usdt.balanceOf(fromUser);
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
        await market.creatorEarningWithdraw(_token, contracts.payToken, {
            from: accounts[2],
        });
        let creator_balance2 = await usdt.balanceOf(accounts[2]);
        let actual_creator2 = BigNumber(creator_balance2.toString()).minus(creator_balance1.toString()).toFixed(0);
        assert.equal(actual_creator2, cal_creator, 'creator amount error');
    });
    it('eip5187-provideFt-sublet-owner-tackback', async function () {
        let ticket = await Ticket.at(contracts.Ticket);
        let usdt = await USDT.at(contracts.payToken);
        let market = await NftMarket.at(contracts.NftMarket);
        const _tokenId = 6;
        const orderId = 7;
        const toUser = accounts[4];
        const fromUser = accounts[0];
        const _expireAt = parseInt(Date.now() / 1000) + 86400;
        await ticket.mint(toUser, _tokenId, 10);
        await ticket.safeRent(toUser, fromUser, _tokenId, 5, _expireAt, {
            from: toUser,
        });
        await ticket.setApprovalForAll(contracts.NftMarket, true, {
            from: fromUser,
        });
        await usdt.operatorMint(toUser, BigNumber(100).multipliedBy(1e18).toFixed(0), Buffer.from(''), Buffer.from(''));
        await usdt.approve(contracts.NftMarket, constants.MaxUint256, {
            from: toUser,
        });
        let creatorEarningsRate = 200;
        let feeRate = 500;
        await market.setNftInfo(ticket.address, false, accounts[2], feeRate, creatorEarningsRate);
        let _token = ticket.address;
        let _endTime = parseInt(Date.now() / 1000) + 86400;
        let _payToken = contracts.payToken;
        let _price = BigNumber(50).multipliedBy(1e18).toFixed(0);
        /// @param _type 0:EIP-721,EIP-3525 OR EIP-4907 sale; 1:EIP-4907 rental; 2:EIP-1155;
        /// 3:EIP-5187 sale; 4:EIP-5187 rental; 5:EIP-5187 sublet; 6:EIP-renew
        /// @param _data 1:[_timestamp] 2:[_amount] 4:[_amount,_timestamp] 5:[_amount,_timestamp] 6:[_amount,_timestamp]
        let _type = 5;
        let _data = web3.eth.abi.encodeParameters(['uint256', 'uint256'], [5, _expireAt]);
        let _isProvideNft = false;
        let taker_balance1 = await usdt.balanceOf(toUser);
        let maker_balance1 = await usdt.balanceOf(fromUser);
        let before_platform = (await market.platformFee(contracts.payToken)).toString();
        let before_creator = (await market.creatorEarning(_token, contracts.payToken)).toString();
        await market.make(_token, _tokenId, _endTime, _payToken, _price, _type, _data, _isProvideNft, {
            from: toUser,
        });
        await market.take(orderId, constants.AddressZero, {
            from: fromUser,
        });
        assert.equal((await ticket.balanceOf(toUser, _tokenId)).toString(), '10', 'nft owner error');
        assert.equal((await ticket.balanceOf(fromUser, _tokenId)).toString(), '0', 'nft owner error');
        assert.equal((await ticket.expireAt(_tokenId, toUser)).toString(), '0', 'nft owner error');
        assert.equal((await ticket.expireAt(_tokenId, fromUser)).toString(), '0', 'nft owner error');
        let taker_balance2 = await usdt.balanceOf(toUser);
        let maker_balance2 = await usdt.balanceOf(fromUser);
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
        await market.creatorEarningWithdraw(_token, contracts.payToken, {
            from: accounts[2],
        });
        let creator_balance2 = await usdt.balanceOf(accounts[2]);
        let actual_creator2 = BigNumber(creator_balance2.toString()).minus(creator_balance1.toString()).toFixed(0);
        assert.equal(actual_creator2, cal_creator, 'creator amount error');
    });

    it('eip5187-provideFt-renew', async function () {
        let ticket = await Ticket.at(contracts.Ticket);
        let usdt = await USDT.at(contracts.payToken);
        let market = await NftMarket.at(contracts.NftMarket);
        const _tokenId = 7;
        const orderId = 8;
        const lessor = accounts[4];
        const nftOwner = accounts[0];
        const _expireAt = parseInt(Date.now() / 1000) + 86400;
        await ticket.mint(nftOwner, _tokenId, 10);
        await ticket.safeRent(nftOwner, lessor, _tokenId, 3, _expireAt, {
            from: nftOwner,
        });
        await ticket.setApprovalForAll(contracts.NftMarket, true, {
            from: nftOwner,
        });
        await usdt.operatorMint(lessor, BigNumber(100).multipliedBy(1e18).toFixed(0), Buffer.from(''), Buffer.from(''));
        await usdt.approve(contracts.NftMarket, constants.MaxUint256, {
            from: lessor,
        });
        let creatorEarningsRate = 200;
        let feeRate = 500;
        await market.setNftInfo(ticket.address, false, accounts[2], feeRate, creatorEarningsRate);
        let _token = ticket.address;
        let _endTime = parseInt(Date.now() / 1000) + 86400;
        let _payToken = contracts.payToken;
        let _price = BigNumber(50).multipliedBy(1e18).toFixed(0);
        /// @param _type 0:EIP-721,EIP-3525 OR EIP-4907 sale; 1:EIP-4907 rental; 2:EIP-1155;
        /// 3:EIP-5187 sale; 4:EIP-5187 rental; 5:EIP-5187 sublet; 6:EIP-renew
        /// @param _data 1:[_timestamp] 2:[_amount] 4:[_amount,_timestamp] 5:[_amount,_timestamp] 6:[_amount,_timestamp]
        let _type = 6;
        let _data = web3.eth.abi.encodeParameters(['uint256', 'uint256'], [3, _expireAt + 86400]);
        let _isProvideNft = false;
        let taker_balance1 = await usdt.balanceOf(lessor);
        let maker_balance1 = await usdt.balanceOf(nftOwner);
        let before_platform = (await market.platformFee(contracts.payToken)).toString();
        let before_creator = (await market.creatorEarning(_token, contracts.payToken)).toString();
        await market.make(_token, _tokenId, _endTime, _payToken, _price, _type, _data, _isProvideNft, {
            from: lessor,
        });
        await market.take(orderId, constants.AddressZero, {
            from: nftOwner,
        });
        assert.equal((await ticket.balanceOf(lessor, _tokenId)).toString(), '3', 'nft owner error');
        assert.equal((await ticket.balanceOf(nftOwner, _tokenId)).toString(), '7', 'nft owner error');
        assert.equal((await ticket.expireAt(_tokenId, lessor)).toString(), _expireAt + 86400, 'nft owner error');
        assert.equal((await ticket.expireAt(_tokenId, nftOwner)).toString(), '0', 'nft owner error');
        let taker_balance2 = await usdt.balanceOf(lessor);
        let maker_balance2 = await usdt.balanceOf(nftOwner);
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
        await market.creatorEarningWithdraw(_token, contracts.payToken, {
            from: accounts[2],
        });
        let creator_balance2 = await usdt.balanceOf(accounts[2]);
        let actual_creator2 = BigNumber(creator_balance2.toString()).minus(creator_balance1.toString()).toFixed(0);
        assert.equal(actual_creator2, cal_creator, 'creator amount error');
    });
});
