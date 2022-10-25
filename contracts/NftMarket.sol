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
        uint256 orderId;
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
    //token => tokenId => user => orderObject
    mapping(address => mapping(uint256 => mapping(address => OrderObject)))
        public orders;
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
    event OrderCancel(address _token, uint256 _tokenId, address _user);
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
    function initialize(address _owner) external initializer {
        _transferOwnership(_owner);
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
        require(
            orders[_token][_tokenId][msg.sender].orderId == 0,
            "order exists"
        );
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
        orders[_token][_tokenId][msg.sender] = OrderObject({
            orderId: id,
            payToken: _payToken,
            price: _price,
            endTime: _endTime,
            _type: _type,
            data: _data,
            isProvideNft: _isProvideNft,
            valid: true
        });
        emit Order(id, msg.sender, _token, _tokenId);
    }

    function cancel(address _token, uint256 _tokenId) external {
        OrderObject storage _order = orders[_token][_tokenId][msg.sender];
        require(_order.valid, "invalid order");
        _order.valid = false;
        if (!_order.isProvideNft) {
            Helper.safeTransfer(
                _order.payToken,
                payable(msg.sender),
                _order.price
            );
        }
        emit OrderCancel(_token, _tokenId, msg.sender);
    }

    function take(
        address _owner,
        address _token,
        uint256 _tokenId
    ) external payable {
        OrderObject storage _order = orders[_token][_tokenId][_owner];
        require(_order.valid, "invalid order");
        _order.valid = false;
        (uint256 _fee, uint256 _creatorEarnings) = _calFee(
            _token,
            _order.price,
            _order.payToken
        );
        emit OrderDealt(_order.orderId, msg.sender, _fee, _creatorEarnings);
        address _from = _owner;
        address _to = msg.sender;
        if (_order.isProvideNft) {
            Helper.safeTransferFrom(_order.payToken, msg.sender, _order.price);
        } else {
            _from = msg.sender;
            _to = _owner;
        }
        Helper.transferNft(
            _order._type,
            _token,
            _tokenId,
            _order.data,
            _from,
            _to
        );
        Helper.safeTransfer(
            _order.payToken,
            payable(_owner),
            _order.price - _fee - _creatorEarnings
        );
    }

    function _calFee(
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

    function offerAccept(
        address _user,
        address _token,
        uint256 _tokenId
    ) external {
        OrderObject storage _order = orders[_token][_tokenId][msg.sender];
        uint256[2] storage _data = offers[_user][_order.orderId];
        require(_order.valid, "invalid order");
        require(!_order.isProvideNft, "call take");
        require(_data[0] > 0, "price is zero");
        require(_data[1] < block.timestamp, "transaction timed out");
        (uint256 _fee, uint256 _creatorEarnings) = _calFee(
            _token,
            _data[0],
            _order.payToken
        );
        emit OfferDealt(
            _order.orderId,
            msg.sender,
            _data[0],
            _fee,
            _creatorEarnings
        );
        _order.valid = false;
        _data[0] = 0;
        Helper.safeTransfer(
            _order.payToken,
            payable(msg.sender),
            _data[0] - _fee
        );
        Helper.transferNft(
            _order._type,
            _token,
            _tokenId,
            _order.data,
            msg.sender,
            _user
        );
    }

    /**
    uint256[2] _data = [price,expired];
    * */
    function offer(
        address _owner,
        address _token,
        uint256 _tokenId,
        uint256[2] calldata _data
    ) external payable {
        OrderObject storage _order = orders[_token][_tokenId][_owner];
        require(_order.valid, "invalid order");
        require(_order.isProvideNft, "provide nft");
        require(_data[0] > 0, "price is zero");
        require(_data[1] > block.timestamp, "time is less current");
        require(offers[msg.sender][_order.orderId][0] == 0, "offer repeated");
        if (_order.payToken == address(0)) {
            require(msg.value == _data[0], "Transfer token is too small");
        } else {
            Helper.safeTransferFrom(_order.payToken, msg.sender, _data[0]);
        }
        offers[msg.sender][_order.orderId] = _data;
        emit Offer(_order.orderId, msg.sender, _data[0]);
    }

    function offerCancel(
        address _owner,
        address _token,
        uint256 _tokenId
    ) external payable {
        OrderObject memory _order = orders[_token][_tokenId][_owner];
        uint256 _price = offers[msg.sender][_order.orderId][0];
        require(_price > 0, "price is zero");
        offers[msg.sender][_order.orderId][0] = 0;
        Helper.safeTransfer(_order.payToken, payable(msg.sender), _price);
        emit OfferCancel(_order.orderId, msg.sender);
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
