// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/utils/introspection/IERC165Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";

///  Note: the ERC-165 identifier for this interface is 0xd4613e9f.
interface IRental is IERC165Upgradeable, IERC1155Upgradeable {
    /**
     * @notice This emits when user rent NFT
     * - `id` The id of the current token
     * - `user` The address to rent the NFT usage rights
     * - `amount` The amount of usage rights
     * - `expire` The specified period of time to rent
     **/
    event Rented(
        uint256 indexed id,
        address indexed user,
        uint256 amount,
        uint256 expire
    );

    event TransferPropertyRightOf(address from, address to, uint256 id);

    /**
     * MUST trigger on any successful call to `renew(address user,uint256 id)`
     *  - `id` The id of the current token
     *  - `user` The user of the NFT
     *  - `expire` The new specified period of time to rent
     **/
    event Renew(uint256 indexed id, address indexed user, uint256 expire);

    /**
     *  MUST trigger on any successful call to `renew(address user,uint256 id,uint256 expire)`
     *  - `id` The id of the current token
     *  - `from` The current user of the NFT
     *  - `to` The new user
     **/
    event Sublet(uint256 indexed id, address indexed from, address to);

    /**
     * @notice This emits when the NFT owner takes back the usage rights from the tenant (the `user`)
     * - id The id of the current token
     * - user The address to rent the NFT's usage rights
     * - amount Amount of usage rights
     **/
    event TakeBack(uint256 indexed id, address indexed user, uint256 amount);

    /**
     * @notice Function to rent out usage rights
     * - from The address to approve
     * - to The address to rent the NFT usage rights
     * - id The id of the current token
     * - amount The amount of usage rights
     * - expire The specified period of time to rent
     **/
    function safeRent(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        uint256 expire
    ) external;

    /**
     * @notice Function to take back usage rights after the end of the tenancy
     * - user The address to rent the NFT's usage rights
     * - tokenId The id of the current token
     **/
    function takeBack(address user, uint256 tokenId) external;

    /**
     * @notice Return the NFT to the address of the NFT property right owner.
     **/
    function propertyRightOf(uint256 id) external view returns (address);

    /**
     * @notice Return the total supply amount of the current token
     **/
    function totalSupply(uint256 id) external view returns (uint256);

    /**
     * @notice Return expire The specified period of time to rent
     **/
    function expireAt(uint256 id, address user) external view returns (uint256);

    /**
     *   extended rental period
     *  - `id` The id of the current token
     *  - `user` The user of the NFT
     *  - `expire` The new specified period of time to rent
     **/
    function renew(
        address user,
        uint256 id,
        uint256 expire
    ) external;

    /**
     *  transfer of usage right
     *  - `id` The id of the current token
     *  - `user` The user of the NFT
     *  - `expire` The new specified period of time to rent
     **/
    function sublet(
        address from,
        address to,
        uint256 id
    ) external;
}
