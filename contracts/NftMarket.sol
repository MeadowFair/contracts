// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.13;
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/interfaces/IERC1820RegistryUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./interfaces/IRental.sol";
import "./libraries/Helper.sol";

contract NftMarket is OwnableUpgradeable, PausableUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    address public feeReceiver;
    uint256 public feeRate;
    uint256 public id;
    mapping(address => bool) public allowToken;
    enum STATUS {
        IDLE,
        SUCCESS,
        CANCELED
    }

    struct OrderObject {
        address token;
        address owner;
        address payToken;
        uint256 tokenId;
        uint256 price;
        uint256 endTime;
        uint8 _type;
        bytes data;
        bool isMaker;
        STATUS status;
    }
    OrderObject[] public orders;
    //offer => orderId => [expired,price]
    mapping(address => mapping(uint256 => uint256[2])) public offers;
    event Order(
        uint256 _orderId,
        address _seller,
        address _token,
        uint256 _tokenId
    );
    event OrderCancel(uint256 _orderId);
    event OrderDealt(uint256 _orderId, address _buyer);
    event Offer(uint256 _orderId, address _buyer, uint256 _price);
    event OfferDealt(uint256 _orderId, address _buyer, uint256 _price);
    event SetAllowToken(address _token, bool _allow);
    event SetFee(uint256 _fee, address _feeReceiver);
    event Withdraw(address _token, address _to, uint256 _amount);

    /**
    _addresses:
        owner,
        cds,
        minter
     */
    function initialize(address _owner) external initializer {
        _transferOwnership(_owner);
    }

    function order(
        address _token,
        uint256 _tokenId,
        uint256 _endTime,
        address _payToken,
        uint256 _price,
        uint8 _type,
        bytes calldata _data
    ) external {
        require(allowToken[_token], "token error");
        require(_price > 0, "price is zeror");
        Helper.checkNft(_type, _token, _tokenId, _data);
        orders.push(
            OrderObject({
                token: _token,
                owner: msg.sender,
                payToken: _payToken,
                tokenId: _tokenId,
                price: _price,
                endTime: _endTime,
                _type: _type,
                data: _data,
                status: STATUS.IDLE
            })
        );
        emit Order(orders.length - 1, msg.sender, _token, _tokenId);
    }

    function cancel(uint256 _orderId) external {
        OrderObject storage _order = orders[_orderId];
        require(_order.status == STATUS.IDLE, "status error");
        require(_order.owner == msg.sender, "status error");
        _order.status = STATUS.CANCELED;
        emit OrderCancel(_orderId);
    }

    function take(uint256 _orderId) external {
        OrderObject storage _order = orders[_orderId];
        uint256 _fee = (_order.price * feeRate) / 10000;
        IERC20Upgradeable _payToken = IERC20Upgradeable(_order.payToken);
        emit OrderDealt(_orderId, msg.sender);
        _payToken.safeTransferFrom(
            msg.sender,
            _order.owner,
            _order.price - _fee
        );
        if (_fee > 0) {
            _payToken.safeTransferFrom(msg.sender, address(this), _fee);
        }
        _order.status = STATUS.SUCCESS;
    }

    function offer(uint256 _orderId, uint256 _price) external {}

    function offerAccept(uint256 _orderId, address _buyer) external {}

    function setAllowToken(address _token, bool _allow) external onlyOwner {
        require(allowToken[_token] != _allow, "repeat operation");
        allowToken[_token] = _allow;
        emit SetAllowToken(_token, _allow);
    }

    function setFee(uint256 _fee, address _feeReceiver) external onlyOwner {
        feeRate = _fee;
        feeReceiver = _feeReceiver;
        emit SetFee(_fee, _feeReceiver);
    }

    function withdraw(
        IERC20Upgradeable _token,
        address _to,
        uint256 _amount
    ) external {
        require(msg.sender == feeReceiver, "caller error");
        require(_amount > 0, "amount error");
        _token.safeTransfer(_to, _amount);
        emit Withdraw(address(_token), _to, _amount);
    }

    /**
     * @dev called by the owner to pause, triggers stopped state
     */
    function pause() public onlyOwner whenNotPaused {
        _pause();
    }

    /**
     * @dev called by the owner to unpause, returns to normal state
     */
    function unpause() public onlyOwner whenPaused {
        pause();
    }
}
