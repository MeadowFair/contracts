// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.13;
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./interfaces/IRental.sol";
import "./libraries/Helper.sol";

contract NftMarket is OwnableUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    address public feeReceiver;
    uint256 public feeRate;
    uint256 public id;
    mapping(address => bool) public allowToken;
    struct OrderObject {
        address token;
        uint256 tokenId;
        address maker;
        uint256 price;
        uint256 endTime;
        address payToken;
        uint8 _type;
        bytes data;
        bool isProvideNft;
        bool valid;
    }
    //offer => orderId => [expired,price]
    mapping(address => mapping(uint256 => uint256[2])) public offers;
    OrderObject[] public orders;
    //token => tokenId => user => orderId
    mapping(address => mapping(uint256 => mapping(address => uint256)))
        public makerOrders;
    struct NftInfo {
        bool forbid;
        address creator;
        uint256 feeRate;
        uint256 creatorEarningsRate;
    }
    //nft token => NftInfo
    mapping(address => NftInfo) public nftInfos;
    //nft token => paytoken => amount
    mapping(address => mapping(address => uint256)) public creatorEarning;
    //paytoken => amount
    mapping(address => uint256) public platformFee;
    event Order(
        uint256 _orderId,
        address _seller,
        address _token,
        uint256 _tokenId
    );
    event OrderCancel(uint256 _orderId);
    event OrderDealt(
        uint256 _orderId,
        address _buyer,
        uint256 _fee,
        uint256 _creatorEarning
    );
    event Offer(uint256 _orderId, address _buyer, uint256 _price);
    event OfferCancel(uint256 _orderId, address _buyer);
    event OfferDealt(
        uint256 _orderId,
        address _buyer,
        uint256 _price,
        uint256 _fee,
        uint256 _creatorEarning
    );
    event SetAllowToken(address _token, bool _allow);
    event SetFee(uint256 _fee, address _feeReceiver);
    event Withdraw(address _token, address _to, uint256 _amount);
    event CreatorEaringWithdraw(
        address _token,
        address _payToken,
        uint256 _amount
    );

    event WithdrawPlatformFee(address _payToken, uint256 _amount);
    event SetNftInfo(address _nft);

    /**
    _addresses:
        owner,
        cds,
        minter
     */
    function initialize(address _owner, address _feeReceiver)
        external
        initializer
    {
        _transferOwnership(_owner);
        feeReceiver = _feeReceiver;
        feeRate = 600;
        orders.push();
    }

    function make(
        address _token,
        uint256 _tokenId,
        uint256 _endTime,
        address _payToken,
        uint256 _price,
        uint8 _type,
        bytes calldata _data,
        bool _isProvideNft
    ) external payable {
        id++;
        require(allowToken[_payToken], "payToken error");
        require(makerOrders[_token][_tokenId][msg.sender] == 0, "order exists");
        require(!nftInfos[_token].forbid, "token forbid");
        Helper.check(
            _type,
            _token,
            _tokenId,
            _data,
            _isProvideNft,
            _payToken,
            _price
        );
        orders.push(
            OrderObject({
                tokenId: _tokenId,
                token: _token,
                maker: msg.sender,
                payToken: _payToken,
                price: _price,
                endTime: _endTime,
                _type: _type,
                data: _data,
                isProvideNft: _isProvideNft,
                valid: true
            })
        );
        makerOrders[_token][_tokenId][msg.sender] = orders.length;
        emit Order(id, msg.sender, _token, _tokenId);
    }

    function cancel(uint256 _orderId) external {
        OrderObject storage _order = orders[_orderId];
        require(msg.sender == _order.maker, "caller error");
        require(_order.valid, "invalid order");
        _order.valid = false;
        if (!_order.isProvideNft) {
            Helper.safeTransfer(
                _order.payToken,
                payable(msg.sender),
                _order.price
            );
        }
        makerOrders[_order.token][_order.tokenId][_order.maker] = 0;
        emit OrderCancel(_orderId);
    }

    function take(uint256 _orderId) external payable {
        OrderObject storage _order = orders[_orderId];
        require(_order.valid, "invalid order");
        _order.valid = false;
        (uint256 _fee, uint256 _creatorEarnings) = _settleFee(
            _order.token,
            _order.price,
            _order.payToken
        );
        emit OrderDealt(_orderId, msg.sender, _fee, _creatorEarnings);
        address _from = _order.maker;
        address _to = msg.sender;
        if (_order.isProvideNft) {
            if (_order.payToken == address(0)) {
                require(msg.value == _order.price, "token amount error");
            } else {
                Helper.safeTransferFrom(
                    _order.payToken,
                    msg.sender,
                    _order.price
                );
            }
        } else {
            _from = msg.sender;
            _to = _order.maker;
        }
        Helper.transferNft(
            _order._type,
            _order.token,
            _order.tokenId,
            _order.data,
            _from,
            _to
        );
        Helper.safeTransfer(
            _order.payToken,
            payable(_from),
            _order.price - _fee - _creatorEarnings
        );
        makerOrders[_order.token][_order.tokenId][_order.maker] = 0;
    }

    function _settleFee(
        address _token,
        uint256 _price,
        address _payToken
    ) internal returns (uint256 _fee, uint256 _creatorEarnings) {
        NftInfo storage _nftInfo = nftInfos[_token];
        uint256 _feeRate = feeRate;
        if (_nftInfo.feeRate > 0) {
            _feeRate = _nftInfo.feeRate;
        }
        _creatorEarnings;
        if (_nftInfo.creatorEarningsRate > 0) {
            _creatorEarnings = (_price * _nftInfo.creatorEarningsRate) / 10000;
            creatorEarning[_token][_payToken] += _creatorEarnings;
        }
        _fee = (_price * _feeRate) / 10000;
        platformFee[_payToken] += _fee;
    }

    function offerAccept(address _user, uint256 _orderId) external {
        OrderObject storage _order = orders[_orderId];
        uint256[2] storage _data = offers[_user][_orderId];
        require(_order.valid, "invalid order");
        require(_order.isProvideNft, "require provide nft");
        require(_data[0] > 0, "price is zero");
        require(msg.sender == _order.maker, "caller error");
        require(_data[1] > block.timestamp, "transaction timed out");
        _order.valid = false;
        (uint256 _fee, uint256 _creatorEarnings) = _settleFee(
            _order.token,
            _data[0],
            _order.payToken
        );
        emit OfferDealt(_orderId, msg.sender, _data[0], _fee, _creatorEarnings);
        Helper.safeTransfer(
            _order.payToken,
            payable(msg.sender),
            _data[0] - _fee - _creatorEarnings
        );
        Helper.transferNft(
            _order._type,
            _order.token,
            _order.tokenId,
            _order.data,
            msg.sender,
            _user
        );
        _data[0] = 0;
        makerOrders[_order.token][_order.tokenId][_order.maker] = 0;
    }

    /**
    uint256[2] _data = [price,expired];
    * */
    function offer(uint256 _orderId, uint256[2] calldata _data)
        external
        payable
    {
        OrderObject storage _order = orders[_orderId];
        require(_order.valid, "invalid order");
        require(_order.isProvideNft, "provide nft");
        require(_data[0] > 0, "price is zero");
        require(_data[1] > block.timestamp, "time is less current");
        require(offers[msg.sender][_orderId][0] == 0, "offer repeated");
        if (_order.payToken == address(0)) {
            require(msg.value == _data[0], "token amount error");
        } else {
            Helper.safeTransferFrom(_order.payToken, msg.sender, _data[0]);
        }
        offers[msg.sender][_orderId] = _data;
        emit Offer(_orderId, msg.sender, _data[0]);
    }

    function offerCancel(uint256 _orderId) external payable {
        OrderObject memory _order = orders[_orderId];
        uint256 _price = offers[msg.sender][_orderId][0];
        require(_price > 0, "price is zero");
        offers[msg.sender][_orderId][0] = 0;
        Helper.safeTransfer(_order.payToken, payable(msg.sender), _price);
        emit OfferCancel(_orderId, msg.sender);
    }

    function setAllowToken(address _token, bool _allow) external onlyOwner {
        require(allowToken[_token] != _allow, "repeat operation");
        allowToken[_token] = _allow;
        emit SetAllowToken(_token, _allow);
    }

    function creatorEaringWithdraw(address _token, address _payToken) external {
        NftInfo storage _nftInfo = nftInfos[_token];
        require(_nftInfo.creator == msg.sender, "call error");
        uint256 _amount = creatorEarning[_token][_payToken];
        require(_amount > 0, "amount is zero");
        creatorEarning[_token][_payToken] = 0;
        Helper.safeTransfer(_payToken, payable(msg.sender), _amount);
        emit CreatorEaringWithdraw(_token, _payToken, _amount);
    }

    function setNftInfo(
        address _token,
        bool _forbid,
        address _creator,
        uint256 _feeRate,
        uint256 _creatorEarningsRate
    ) external onlyOwner {
        nftInfos[_token] = NftInfo({
            forbid: _forbid,
            creator: _creator,
            feeRate: _feeRate,
            creatorEarningsRate: _creatorEarningsRate
        });
        emit SetNftInfo(_token);
    }

    function withdrawPlatformFee(address _payToken) external {
        require(feeReceiver == msg.sender, "call error");
        uint256 _amount = platformFee[_payToken];
        require(_amount > 0, "amount is zero");
        platformFee[_payToken] = 0;
        Helper.safeTransfer(_payToken, payable(msg.sender), _amount);
        emit WithdrawPlatformFee(_payToken, _amount);
    }

    function setFee(uint256 _fee, address _feeReceiver) external onlyOwner {
        feeRate = _fee;
        feeReceiver = _feeReceiver;
        emit SetFee(_fee, _feeReceiver);
    }

    function withdraw(
        address _payToken,
        address payable _recipient,
        uint256 _amount
    ) external {
        require(msg.sender == feeReceiver, "caller error");
        require(_amount > 0, "amount error");
        Helper.safeTransfer(_payToken, _recipient, _amount);
        emit Withdraw(_payToken, _recipient, _amount);
    }
}
