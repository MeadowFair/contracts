// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "./interfaces/IRental.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

contract Test {
    struct Info {
        bool occur;
    }
    Info[] public infos;
    bool public result;

    function add() external {
        infos.push(Info({occur: false}));
    }

    function test(uint256 _index) external {
        Info memory _info = infos[_index];
        closeInfo(_index);
        result = _info.occur;
    }

    function closeInfo(uint256 _index) public {
        infos[_index].occur = true;
    }

    function getInterfaceId() external pure returns(bytes4){
        return  type(IRental).interfaceId;
    }
}