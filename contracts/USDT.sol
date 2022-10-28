// SPDX-License-Identifier: GPL-2.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC777/ERC777.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract USDT is ERC777, Ownable {
    mapping(address => bool) public greyList;

    event AddGreyList(address indexed user);
    event RemoveGreyList(address indexed user);

    /**
     * @dev `defaultOperators` may be an empty array.
     */
    constructor(
        string memory name_,
        string memory symbol_,
        address[] memory defaultOperators_,
        uint256[] memory initAmount,
        address[] memory initReceiver,
        address _owner
    ) ERC777(name_, symbol_, defaultOperators_) {
        _transferOwnership(_owner);
        for (uint256 i = 0; i < initAmount.length; i++) {
            _mint(initReceiver[i], initAmount[i], "", "");
        }
    }

    function operatorMint(
        address account,
        uint256 amount,
        bytes memory userData,
        bytes memory operatorData
    ) external onlyOwner {
        _mint(account, amount, userData, operatorData);
    }

    function addGreyList(address _user) external onlyOwner {
        require(_user != address(0), "zero address");
        require(!greyList[_user], "in the list");
        greyList[_user] = true;
        emit AddGreyList(_user);
    }

    function removeGreyList(address _user) external onlyOwner {
        require(_user != address(0), "zero address");
        require(greyList[_user], "removed");
        greyList[_user] = false;
        emit RemoveGreyList(_user);
    }

    function _beforeTokenTransfer(
        address,
        address from,
        address,
        uint256
    ) internal view override {
        require(!greyList[from], "in greyList");
    }
}
