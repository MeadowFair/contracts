// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.13;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "../interfaces/IRental.sol";
import "../interfaces/IERC4907.sol";

library Helper {
    /// @param _type 0:EIP-721,EIP-3525 OR EIP-4907 sale; 1:EIP-4907 rental; 2:EIP-1155;
    /// 3:EIP-5187 sale; 4:EIP-5187 rental; 5:EIP-5187 sublet; 6:EIP-renew
    function checkNft(
        uint8 _type,
        address _nft,
        uint256 _tokenId,
        bytes calldata _data
    ) internal view {
        bytes4 _interfaceId;
        if (_type == 0) {
            _interfaceId = type(IERC721).interfaceId;
        } else if (_type == 1) {
            _interfaceId = type(IERC4907).interfaceId;
        } else if (_type == 2) {
            _interfaceId = type(IERC1155).interfaceId;
        } else if (_type <= 6) {
            _interfaceId = type(IRental).interfaceId;
        } else {
            revert("type error");
        }
        require(
            IERC165(_nft).supportsInterface(type(IERC721).interfaceId),
            "not support"
        );
        IRental nft = IRental(_nft);
        if (_type == 0 || _type == 1) {
            require(
                IERC721(_nft).ownerOf(_tokenId) == msg.sender,
                "token owner error"
            );
            require(
                IERC721(_nft).getApproved(_tokenId) == address(this) ||
                    IERC721(_nft).isApprovedForAll(msg.sender, address(this)),
                "not approved"
            );
        } else {
            require(
                nft.isApprovedForAll(msg.sender, address(this)),
                "not approved"
            );
        }
        if (_type == 1) {
            uint256 _timestamp = abi.decode(_data, (uint256));
            require(block.timestamp < _timestamp, "timestamp error");
        } else if (_type == 2) {
            uint256 _amount = abi.decode(_data, (uint256));
            require(
                _amount > 0 && nft.balanceOf(msg.sender, _tokenId) == _amount,
                "amount error"
            );
        } else if (_type == 3) {
            require(nft.propertyRightOf(_tokenId) == msg.sender, "not owner");
        } else if (_type == 4) {
            (uint256 _amount, uint256 _timestamp) = abi.decode(
                _data,
                (uint256, uint256)
            );
            require(block.timestamp < _timestamp, "timestamp error");
            require(nft.propertyRightOf(_tokenId) == msg.sender, "not owner");
            require(
                _amount > 0 && nft.balanceOf(msg.sender, _tokenId) > _amount,
                "amount error"
            );
        } else if (_type == 5) {
            uint256 _amount = abi.decode(_data, (uint256));
            require(
                block.timestamp < nft.expireAt(_tokenId, msg.sender),
                "timestamp error"
            );
            require(
                _amount > 0 && nft.balanceOf(msg.sender, _tokenId) == _amount,
                "amount error"
            );
        } else if (_type == 6) {
            require(nft.balanceOf(msg.sender, _tokenId) > 0, "balance error");
        }
    }
}
