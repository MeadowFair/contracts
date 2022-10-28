// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IRental.sol";

interface ITicket is IRental {
    function mint(
        address to,
        uint256 tokenId,
        uint256 amount
    ) external;
}
