// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "./PausableV2.sol";
import "./interfaces/IRental.sol";
import "./interfaces/ITicket.sol";

contract NftMarket is PausableV2, Initializable {
    using SafeERC20 for IERC20;
    address public feeReceiver;
    uint256 public feeRate;
    mapping(address => bool) public allowToken;
    struct SaleInfo {
        address payToken;
        uint256 price;
        uint256 term;
        uint256 amount;
        bool rental;
    }
    //owner => token=> token_id => RentInfo
    mapping(address => mapping(address => mapping(uint256 => SaleInfo)))
        public saleList;
    event Make(address _seller, address _token, uint256 _tokenId);
    event Cancel(address _seller, address _token, uint256 _tokenId);
    event Dealt(
        address _seller,
        address _token,
        uint256 _tokenId,
        address _user
    );
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

    function make(
        address _token,
        uint256 _tokenId,
        address _payToken,
        uint256 _price,
        uint256 _amount,
        uint256 _term,
        bool _rental
    ) external {
        require(allowToken[_token], "token error");
        require(_amount > 0 && _term > 0 && _price > 0);
        IRental _ticket = IRental(_token);
        IERC1155 _nft = IERC1155(_token);
        bool rentable;
        bytes4 rentalInterfaceId = type(IRental).interfaceId;
        bytes4 erc721InterfaceId = type(IERC721).interfaceId;
        bool isERC721 = _nft.supportsInterface(erc721InterfaceId);
        if (isERC721) {
            //ERC721
            require(
                _ticket.propertyRightOf(_tokenId) == msg.sender,
                "not owner"
            );
        } else if (_nft.supportsInterface(rentalInterfaceId)) {
            //Rentable-NFT
            if (_rental) {
                //for rental
                require(
                    _nft.balanceOf(msg.sender, _tokenId) >= _amount,
                    "insufficient balance"
                );
            } else {
                require(!ITicket(_token).frozeOf(_tokenId), "is frozed");
            }
            require(
                _ticket.propertyRightOf(_tokenId) == msg.sender,
                "not owner"
            );
            rentable = true;
        } else {
            //ERC1155
            require(
                _nft.balanceOf(msg.sender, _tokenId) >= _amount,
                "insufficient balance"
            );
        }
        require(
            _nft.isApprovedForAll(msg.sender, address(this)),
            "approve first"
        );
        require((_rental && rentable) || !_rental, "not rentable");
        saleList[msg.sender][_token][_tokenId] = SaleInfo({
            payToken: _payToken,
            price: _price,
            term: _term,
            amount: _amount,
            rental: _rental
        });
        emit Make(msg.sender, _token, _tokenId);
    }

    function cancel(address _token, uint256 _tokenId) external {
        SaleInfo storage _rentInfo = saleList[msg.sender][_token][_tokenId];
        require(_rentInfo.price > 0, "in rent");
        delete saleList[msg.sender][_token][_tokenId];
        emit Cancel(msg.sender, _token, _tokenId);
    }

    function take(
        address _seller,
        address _token,
        uint256 _tokenId
    ) external {
        SaleInfo storage _saleInfo = saleList[_seller][_token][_tokenId];
        require(_saleInfo.price > 0);
        uint256 _fee = (_saleInfo.price * feeRate) / 10000;
        IERC20 _payToken = IERC20(_saleInfo.payToken);
        emit Dealt(_seller, _token, _tokenId, msg.sender);
        _payToken.safeTransferFrom(msg.sender, _seller, _saleInfo.price - _fee);
        if (_fee > 0) {
            _payToken.safeTransferFrom(msg.sender, address(this), _fee);
        }
        if (_saleInfo.rental) {
            IRental(_token).safeRent(
                _seller,
                msg.sender,
                _tokenId,
                _saleInfo.amount,
                block.timestamp + _saleInfo.term
            );
        } else {
            IERC1155 token = IERC1155(_token);
            bytes4 erc721InterfaceId = type(IERC721).interfaceId;
            bool isERC721 = token.supportsInterface(erc721InterfaceId);
            if (isERC721) {
                IERC721(_token).safeTransferFrom(_seller, msg.sender, _tokenId);
            } else {
                bytes4 rentalInterfaceId = type(IRental).interfaceId;
                bool isRentable = token.supportsInterface(rentalInterfaceId);
                uint256 _amount = isRentable
                    ? token.balanceOf(_seller, _tokenId)
                    : _saleInfo.amount;
                token.safeTransferFrom(
                    _seller,
                    msg.sender,
                    _tokenId,
                    _amount,
                    ""
                );
            }
        }
        delete saleList[_seller][_token][_tokenId];
    }

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
        IERC20 _token,
        address _to,
        uint256 _amount
    ) external {
        require(msg.sender == feeReceiver, "caller error");
        require(_amount > 0, "amount error");
        _token.safeTransfer(_to, _amount);
        emit Withdraw(address(_token), _to, _amount);
    }
}
