// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.13;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract Eip1155 is ERC1155 {
    event Mint(uint256 _tokenId);

    constructor() ERC1155("") {}

    function mint(
        address to,
        uint256 tokenId,
        uint256 amount
    ) external {
        _mint(to, tokenId, amount, "");
        emit Mint(tokenId);
    }
}
