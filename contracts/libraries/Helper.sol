// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.13;

import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "../interfaces/IRental.sol";
import "../interfaces/IERC4907.sol";

library Helper {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    function check(
        uint8 _type,
        address _token,
        uint256 _tokenId,
        bytes calldata _data,
        bool _isProvideNft,
        address _payToken,
        uint256 _price
    ) external {
        require(_price > 0, "price is zeror");
        if (_isProvideNft) {
            Helper.checkNft(_type, _token, _tokenId, _data);
        } else {
            Helper.checkNftOffer(_type, _token, _tokenId, _data);
            if (_payToken == address(0)) {
                require(_price == msg.value, "Transfer token is too small");
            } else {
                Helper.safeTransferFrom(_payToken, msg.sender, _price);
            }
        }
    }

    /// @param _type 0:EIP-721,EIP-3525 OR EIP-4907 sale; 1:EIP-4907 rental; 2:EIP-1155;
    /// 3:EIP-5187 sale; 4:EIP-5187 rental; 5:EIP-5187 sublet;
    /// @param _data 1:[_period] 2:[_amount] 4:[_amount,_period] 5:[_amount,_timestamp]
    function checkNft(
        uint8 _type,
        address _nft,
        uint256 _tokenId,
        bytes calldata _data
    ) internal view {
        bytes4 _interfaceId;
        if (_type == 0) {
            _interfaceId = type(IERC721Upgradeable).interfaceId;
        } else if (_type == 1) {
            _interfaceId = type(IERC4907).interfaceId;
        } else if (_type == 2) {
            _interfaceId = type(IERC1155Upgradeable).interfaceId;
        } else if (_type <= 5) {
            _interfaceId = type(IRental).interfaceId;
        } else {
            revert("type error");
        }
        require(
            IERC165Upgradeable(_nft).supportsInterface(_interfaceId),
            "not support"
        );
        IRental nft = IRental(_nft);
        if (_type == 0 || _type == 1) {
            require(
                IERC721Upgradeable(_nft).ownerOf(_tokenId) == msg.sender,
                "token owner error"
            );
            require(
                IERC721Upgradeable(_nft).getApproved(_tokenId) ==
                    address(this) ||
                    IERC721Upgradeable(_nft).isApprovedForAll(
                        msg.sender,
                        address(this)
                    ),
                "not approved"
            );
        } else {
            require(
                nft.isApprovedForAll(msg.sender, address(this)),
                "not approved"
            );
        }
        if (_type == 1) {
            uint64 _period = abi.decode(_data, (uint64));
            require(_period > 0, "period error");
        } else if (_type == 2) {
            uint256 _amount = abi.decode(_data, (uint256));
            require(
                _amount > 0 && nft.balanceOf(msg.sender, _tokenId) >= _amount,
                "amount error"
            );
        } else if (_type == 3) {
            require(nft.propertyRightOf(_tokenId) == msg.sender, "not owner");
        } else if (_type == 4) {
            (uint256 _amount, uint256 _period) = abi.decode(
                _data,
                (uint256, uint256)
            );
            require(_period > 0, "period error");
            require(nft.propertyRightOf(_tokenId) == msg.sender, "not owner");
            require(
                _amount > 0 && nft.balanceOf(msg.sender, _tokenId) > _amount,
                "amount error"
            );
        } else if (_type == 5) {
            (uint256 _amount, uint256 _timestamp) = abi.decode(
                _data,
                (uint256, uint256)
            );
            require(
                _timestamp == nft.expireAt(_tokenId, msg.sender),
                "timestamp error"
            );
            require(
                _amount > 0 && nft.balanceOf(msg.sender, _tokenId) == _amount,
                "amount error"
            );
        }
    }

    /// @param _type 0:EIP-721,EIP-3525 OR EIP-4907 sale; 1:EIP-4907 rental; 2:EIP-1155;
    /// 3:EIP-5187 sale; 4:EIP-5187 rental; 5:EIP-5187 sublet; 6:EIP-renew
    /// @param _data 1:[_period] 2:[_amount] 4:[_amount,_period] 5:[_amount,_timestamp] 6:[_amount,_timestamp]
    function checkNftOffer(
        uint8 _type,
        address _nft,
        uint256 _tokenId,
        bytes calldata _data
    ) internal view {
        bytes4 _interfaceId;
        if (_type == 0) {
            _interfaceId = type(IERC721Upgradeable).interfaceId;
        } else if (_type == 1) {
            _interfaceId = type(IERC4907).interfaceId;
        } else if (_type == 2) {
            _interfaceId = type(IERC1155Upgradeable).interfaceId;
        } else if (_type <= 6) {
            _interfaceId = type(IRental).interfaceId;
        } else {
            revert("type error");
        }
        require(
            IERC165Upgradeable(_nft).supportsInterface(_interfaceId),
            "not support"
        );
        IRental nft = IRental(_nft);
        if (_type == 1) {
            uint64 _period = abi.decode(_data, (uint64));
            require(_period > 0, "period error");
        } else if (_type == 2) {
            uint256 _amount = abi.decode(_data, (uint256));
            require(_amount > 0, "amount error");
        } else if (_type == 3) {
            require(nft.propertyRightOf(_tokenId) != msg.sender, "is owner");
        } else if (_type == 4) {
            (uint256 _amount, uint256 _period) = abi.decode(
                _data,
                (uint256, uint256)
            );
            require(_period > 0, "period error");
            require(nft.propertyRightOf(_tokenId) != msg.sender, "is owner");
            require(
                _amount > 0 && nft.balanceOf(msg.sender, _tokenId) == 0,
                "amount error"
            );
        } else if (_type == 5) {
            (uint256 _amount, uint256 _timestamp) = abi.decode(
                _data,
                (uint256, uint256)
            );
            require(_amount > 0 && _timestamp > block.timestamp, "data error");
            require(
                nft.propertyRightOf(_tokenId) == msg.sender ||
                    nft.balanceOf(msg.sender, _tokenId) == 0,
                "balance error"
            );
        } else if (_type == 6) {
            (uint256 _amount, uint256 _timestamp) = abi.decode(
                _data,
                (uint256, uint256)
            );
            require(_amount > 0 && _timestamp > block.timestamp, "data error");
            require(nft.balanceOf(msg.sender, _tokenId) > 0, "balance error");
            require(
                nft.propertyRightOf(_tokenId) != msg.sender,
                "caller is owner"
            );
        }
    }

    /// @param _type 0:EIP-721,EIP-3525 OR EIP-4907 sale; 1:EIP-4907 rental; 2:EIP-1155;
    /// 3:EIP-5187 sale; 4:EIP-5187 rental; 5:EIP-5187 sublet; 6:EIP-renew
    function transferNft(
        uint8 _type,
        address _nft,
        uint256 _tokenId,
        bytes memory _data,
        address _from,
        address _to
    ) internal {
        IRental nft = IRental(_nft);
        if (_type == 0) {
            IERC721Upgradeable(_nft).safeTransferFrom(_from, _to, _tokenId);
        } else if (_type == 1) {
            uint64 _period = abi.decode(_data, (uint64));
            IERC4907(_nft).setUser(
                _tokenId,
                _to,
                _period + uint64(block.timestamp)
            );
        } else if (_type == 2) {
            uint256 _amount = abi.decode(_data, (uint256));
            nft.safeTransferFrom(_from, _to, _tokenId, _amount, "");
        } else if (_type == 3) {
            nft.safeTransferFrom(
                _from,
                _to,
                _tokenId,
                nft.balanceOf(_from, _tokenId),
                ""
            );
        } else if (_type == 4) {
            (uint256 _amount, uint256 _period) = abi.decode(
                _data,
                (uint256, uint256)
            );
            require(_period > 0, "period error");
            nft.safeRent(
                _from,
                _to,
                _tokenId,
                _amount,
                block.timestamp + _period
            );
        } else if (_type == 5) {
            (uint256 _amount, uint256 _timestamp) = abi.decode(
                _data,
                (uint256, uint256)
            );
            require(nft.balanceOf(_from, _tokenId) == _amount, "amount error");
            require(
                nft.expireAt(_tokenId, _from) == _timestamp,
                "timestamp error"
            );
            nft.sublet(_from, _to, _tokenId);
        } else if (_type == 6) {
            (uint256 _amount, uint256 _timestamp) = abi.decode(
                _data,
                (uint256, uint256)
            );
            require(_timestamp > block.timestamp, "data error");
            require(nft.balanceOf(_to, _tokenId) == _amount, "amount error");
            require(nft.propertyRightOf(_tokenId) == _from, "owner error");
            nft.renew(_to, _tokenId, _timestamp);
        }
    }

    function safeTransferFrom(
        address _token,
        address _from,
        uint256 _amount
    ) internal {
        IERC20Upgradeable(_token).safeTransferFrom(
            _from,
            address(this),
            _amount
        );
    }

    function safeTransfer(
        address _token,
        address payable _recipient,
        uint256 _amount
    ) internal {
        if (_token == address(0)) {
            require(address(this).balance >= _amount, "insufficient balance");
            (bool success, ) = _recipient.call{value: _amount}("");
            require(success, "unable to send value");
        } else {
            IERC20Upgradeable(_token).safeTransfer(_recipient, _amount);
        }
    }
}
