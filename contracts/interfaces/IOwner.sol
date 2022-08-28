// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ICDS.sol";

interface IOwner {
    function owner() external view returns (address);
}