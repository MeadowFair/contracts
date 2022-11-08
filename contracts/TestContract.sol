// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.13;

import "./interfaces/IRental.sol";
import "./interfaces/IERC4907.sol";
import "./interfaces/IERC3525.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

contract TestContract {
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

    function getInterfaceId()
        external
        pure
        returns (bytes4[5] memory interfaces)
    {
        interfaces[0] = type(IRental).interfaceId;
        interfaces[1] = type(IERC4907).interfaceId;
        interfaces[2] = type(IERC3525).interfaceId;
        interfaces[3] = type(IERC721).interfaceId;
        interfaces[4] = type(IERC1155).interfaceId;
    }
}
