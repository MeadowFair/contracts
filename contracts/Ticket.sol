// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.13;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155ReceiverUpgradeable.sol";
import "./interfaces/ITicket.sol";

contract Ticket is
    OwnableUpgradeable,
    ITicket,
    ERC1155Upgradeable,
    IERC1155ReceiverUpgradeable
{
    using StringsUpgradeable for uint256;
    // struct tokenInfo
    struct TokenInfo {
        address owner;
        uint256 totalSupply;
    }
    uint256 private _totalSupply;
    mapping(uint256 => TokenInfo) private _tokensInfo;
    mapping(uint256 => bool) public greyList;
    /**
    tokenId => address => expires
    * */
    mapping(uint256 => mapping(address => uint256)) public expireAt;
    bool private _noCheck;
    event Mint(uint256 _tokenId);
    event SetGreyTokenId(uint256 _tokenId, bool _allow);
    event SetURI(string _newuri);

    function initialize(string memory newuri, address _owner)
        external
        initializer
    {
        __ERC1155_init(newuri);
        _transferOwnership(_owner);
    }

    function name() external pure returns (string memory) {
        return "Ticket";
    }

    function symbol() external pure returns (string memory) {
        return "T";
    }

    function uri(uint256 id) public view override returns (string memory) {
        return string(abi.encodePacked(super.uri(id), id.toString()));
    }

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    modifier unCheck() {
        _noCheck = true;
        _;
        _noCheck = false;
    }

    function setURI(string memory newuri) external onlyOwner {
        _setURI(newuri);
        emit SetURI(newuri);
    }

    function safeRent(
        address from,
        address to,
        uint256 tokenId,
        uint256 amount,
        uint256 expires
    ) external unCheck {
        require(expires > 0, "expires is zero");
        require(!greyList[tokenId], "in greyList");
        require(expireAt[tokenId][to] == 0, "rent exists");
        require(
            _tokensInfo[tokenId].owner == from && from != to,
            "token owner error"
        );
        safeTransferFrom(from, to, tokenId, amount, "");
        expireAt[tokenId][to] = expires;
        emit Rented(tokenId, to, amount, expires);
    }

    function takeBack(address user, uint256 tokenId) external unCheck {
        TokenInfo memory _tokenInfo = _tokensInfo[tokenId];
        uint256 _expires = expireAt[tokenId][user];
        require(_expires > 0 && block.timestamp >= _expires, "_expires error");
        uint256 _amount = balanceOf(user, tokenId);
        _safeTransferFrom(user, _tokenInfo.owner, tokenId, _amount, "");
        delete expireAt[tokenId][user];
        emit TakeBack(tokenId, user, _amount);
    }

    function renew(
        address user,
        uint256 id,
        uint256 expire
    ) external {
        require(
            isApprovedForAll(_tokensInfo[id].owner, msg.sender),
            "not approved"
        );
        require(balanceOf(user, id) > 0, "balance is zero");
        uint256 _expireAt = expireAt[id][user];
        require(
            _expireAt > 0 && expire > _expireAt && expire > block.timestamp,
            "not rent"
        );
        expireAt[id][user] = expire;
        emit Renew(id, user, expire);
    }

    /**
     *  transfer of usage right
     *  - `id` The id of the current token
     *  - `user` The user of the NFT
     *  - `expire` The new specified period of time to rent
     **/
    function sublet(
        address from,
        address to,
        uint256 id
    ) external unCheck {
        require(isApprovedForAll(from, msg.sender), "not approved");
        uint256 _balance = balanceOf(from, id);
        uint256 _expire = expireAt[id][from];
        require(
            _balance > 0 && expireAt[id][from] > block.timestamp,
            "from token invalid"
        );
        if (to != _tokensInfo[id].owner) {
            require(
                balanceOf(to, id) == 0 && expireAt[id][to] == 0,
                "to address exists token"
            );
            expireAt[id][to] = _expire;
        }
        expireAt[id][from] = 0;
        _safeTransferFrom(from, to, id, _balance, "");
        emit Sublet(id, from, to);
    }

    function mint(
        address to,
        uint256 tokenId,
        uint256 amount
    ) external unCheck {
        TokenInfo storage _tokenInfo = _tokensInfo[tokenId];
        require(_tokenInfo.totalSupply == 0, "token exists");
        _mint(to, tokenId, amount, "");
        _tokenInfo.owner = to;
        _tokenInfo.totalSupply = amount;
        _totalSupply++;
        emit Mint(tokenId);
    }

    /**
     * @dev See {ERC1155-_beforeTokenTransfer}.
     */
    function _beforeTokenTransfer(
        address,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory
    ) internal virtual override {
        if (_noCheck) return;
        for (uint256 i = 0; i < ids.length; ++i) {
            TokenInfo storage _tokenInfo = _tokensInfo[ids[i]];
            require(!greyList[ids[i]], "in greyList");
            require(_tokenInfo.owner == from, "not token owner");
            require(
                balanceOf(from, ids[i]) == amounts[i],
                "amount equals to balance"
            );
            _tokenInfo.owner = to;
            expireAt[ids[i]][to] = 0;
            emit TransferPropertyRightOf(from, to, ids[i]);
        }
    }

    function setGreyTokenId(uint256 _tokenId, bool _allow) external onlyOwner {
        require(greyList[_tokenId] != _allow, "repeat operation");
        greyList[_tokenId] = _allow;
        emit SetGreyTokenId(_tokenId, _allow);
    }

    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC1155ReceiverUpgradeable.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC1155ReceiverUpgradeable.onERC1155BatchReceived.selector;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(IERC165Upgradeable, ERC1155Upgradeable)
        returns (bool)
    {
        return
            interfaceId == type(IRental).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function totalSupply(uint256 id) public view returns (uint256) {
        return _tokensInfo[id].totalSupply;
    }

    function propertyRightOf(uint256 id) external view returns (address) {
        return _tokensInfo[id].owner;
    }

    function exists(uint256 id) external view returns (bool) {
        return totalSupply(id) > 0;
    }
}
