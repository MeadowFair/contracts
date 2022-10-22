// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IRental.sol";

interface ITicket is IRental {
    function mint(
        address to,
        uint256 tokenId,
        uint256 amount,
        uint256 position
    ) external;

    function use(
        address user,
        uint256 tokenId,
        uint256 expires
    ) external;

    function recover(address user, uint256 tokenId) external;

    function positionOf(uint256 id) external view returns (uint256);

    function frozeOf(uint256 id) external view returns (bool);

    function freeze(uint256 tokenId, address from) external;

    function unfreeze(uint256 tokenId) external;
}
