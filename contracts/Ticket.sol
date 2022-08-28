// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./interfaces/ITicket.sol";
import "./interfaces/IRental.sol";
import "./PausableV2.sol";

contract Ticket is
    ERC1155(""),
    PausableV2,
    ITicket,
    IRental,
    Initializable,
    IERC1155Receiver
{
    using Strings for uint256;
    // struct tokenInfo
    struct TokenInfo {
        address owner;
        uint256 position;
        uint256 totalSupply;
        bool froze;
    }
    uint256 private _totalSupply;
    mapping(uint256 => TokenInfo) private _tokensInfo;
    mapping(uint256 => bool) public greyList;
    /**
    tokenId => address => expires
    * */
    mapping(uint256 => mapping(address => uint256)) public rentExpires;
    bool private _noCheck;
    address public miner;
    address public cds;
    event Mint(uint256 _tokenId, uint256 _position);
    event Setminer(address _miner);
    event SetGreyTokenId(uint256 _tokenId, bool _allow);
    event Used(address _user, uint256 _tokenId);
    event Recovered(address _user, uint256 _tokenId);
    event Froze(uint256 _tokenId);
    event Unfroze(uint256 _tokenId);
    event SetURI(string _newuri);
    event TransferOwner(
        address from,
        address to,
        uint256[] ids,
        uint256[] amounts
    );

    /**
        _address[0] cds
        _address[1] miner
        _address[2] owner
     */
    function initialize(string memory newuri, address[3] calldata _address)
        external
        initializer
    {
        _transferOwnership(_address[0]);
        cds = _address[1];
        miner = _address[2];
        _setURI(newuri);
    }

    function name() external pure returns (string memory) {
        return "GyroX Ticket";
    }

    function symbol() external pure returns (string memory) {
        return "GYXT";
    }

    function uri(uint256 id) public view override returns (string memory) {
        return string(abi.encodePacked(super.uri(id), id.toString()));
    }

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    modifier onlyCDS() {
        require(msg.sender == cds);
        _noCheck = true;
        _;
        _noCheck = false;
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
        require(rentExpires[tokenId][to] == 0, "rent exists");
        require(
            _tokensInfo[tokenId].owner == from && from != to,
            "token owner error"
        );
        safeTransferFrom(from, to, tokenId, amount, "");
        rentExpires[tokenId][to] = expires;
        emit Rented(tokenId, to, amount, expires);
    }

    function takeBack(address user, uint256 tokenId) external unCheck {
        TokenInfo memory _tokenInfo = _tokensInfo[tokenId];
        uint256 _expires = rentExpires[tokenId][user];
        require(_expires > 0 && block.timestamp >= _expires, "_expires error");
        uint256 _amount = balanceOf(user, tokenId);
        _safeTransferFrom(user, _tokenInfo.owner, tokenId, _amount, "");
        delete rentExpires[tokenId][user];
        emit TakeBack(tokenId, user, _amount);
    }

    function use(
        address user,
        uint256 tokenId,
        uint256 expires
    ) external onlyCDS {
        require(
            _tokensInfo[tokenId].owner == user ||
                rentExpires[tokenId][user] >= expires,
            "expired"
        );
        _safeTransferFrom(user, address(this), tokenId, 1, "");
        emit Used(user, tokenId);
    }

    function recover(address user, uint256 tokenId) external onlyCDS {
        emit Recovered(user, tokenId);
        if (rentExpires[tokenId][user] == 0) {
            user = _tokensInfo[tokenId].owner;
        }
        _safeTransferFrom(address(this), user, tokenId, 1, "");
    }

    function freeze(uint256 tokenId, address from) external onlyCDS {
        TokenInfo storage _tokenInfo = _tokensInfo[tokenId];
        require(!_tokenInfo.froze, "in freezing");
        require(from == _tokenInfo.owner, "token owner error");
        _tokenInfo.froze = true;
        _safeTransferFrom(_tokenInfo.owner, address(this), tokenId, 1, "");
        emit Froze(tokenId);
    }

    function unfreeze(uint256 tokenId) external onlyCDS {
        TokenInfo storage _tokenInfo = _tokensInfo[tokenId];
        require(_tokenInfo.froze, "not frozen");
        _safeTransferFrom(address(this), _tokenInfo.owner, tokenId, 1, "");
        _tokenInfo.froze = false;
        emit Unfroze(tokenId);
    }

    function mint(
        address to,
        uint256 tokenId,
        uint256 amount,
        uint256 position
    ) external unCheck {
        require(msg.sender == miner);
        TokenInfo storage _tokenInfo = _tokensInfo[tokenId];
        require(_tokenInfo.totalSupply == 0, "token exists");
        _mint(to, tokenId, amount, "");
        _tokenInfo.owner = to;
        _tokenInfo.totalSupply = amount;
        _tokenInfo.position = position;
        _totalSupply++;
        emit Mint(tokenId, position);
    }

    function isApprovedForAll(address account, address operator)
        public
        view
        override
        returns (bool)
    {
        return operator == cds || super.isApprovedForAll(account, operator);
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
            require(!_tokenInfo.froze, "token is froze");
            require(
                balanceOf(from, ids[i]) == amounts[i],
                "amount equals to balance"
            );
            _tokenInfo.owner = to;
        }
        emit TransferOwner(from, to, ids, amounts);
    }

    function setminer(address _miner) external onlyOwner {
        require(_miner != miner, "repeat operation");
        miner = _miner;
        emit Setminer(_miner);
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
        return IERC1155Receiver.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC1155Receiver.onERC1155BatchReceived.selector;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, IERC165)
        returns (bool)
    {
        return
            interfaceId == type(IRental).interfaceId ||
            interfaceId == type(IERC1155Receiver).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function totalSupply(uint256 id) public view returns (uint256) {
        return _tokensInfo[id].totalSupply;
    }

    function propertyRightOf(uint256 id) external view returns (address) {
        return _tokensInfo[id].owner;
    }

    function frozeOf(uint256 id) external view returns (bool) {
        return _tokensInfo[id].froze;
    }

    function positionOf(uint256 id) external view returns (uint256) {
        return _tokensInfo[id].position;
    }

    function exists(uint256 id) external view returns (bool) {
        return totalSupply(id) > 0;
    }
}
