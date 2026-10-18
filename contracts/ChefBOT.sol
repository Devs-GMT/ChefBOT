// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ChefBOT — on-chain cooking stamps
/// @notice Records that a wallet "cooked" a recipe. A transaction proves a
///         wallet submitted a record — it does not physically verify cooking.
/// @dev Canonical recipe-key algorithm (must stay byte-identical to
///      lib/recipe-key.ts):
///        1. UTF-8 bytes of the title.
///        2. Trim leading/trailing ASCII whitespace (space, tab, LF, CR).
///        3. Lowercase ASCII letters only (0x41-0x5A -> +0x20); non-ASCII
///           bytes are unchanged.
///        4. key = keccak256(bytes(normalizedTitle)).
///      The contract re-normalizes internally, so duplicate-stamp prevention
///      never depends on the frontend sending pre-normalized titles.
contract ChefBOT {
    struct Dish {
        string title;
        string emoji;
        uint32 cooks;
    }

    mapping(bytes32 => Dish) public dishes;
    bytes32[] public dishKeys;
    mapping(bytes32 => mapping(address => bool)) public cooked;
    mapping(address => bytes32[]) public myDishes;

    /// @notice Maximum accepted raw title length in bytes (UTF-8).
    uint256 public constant MAX_TITLE_BYTES = 64;
    /// @notice Maximum accepted emoji length in bytes (UTF-8).
    uint256 public constant MAX_EMOJI_BYTES = 16;

    event Cooked(
        bytes32 indexed key,
        address indexed cook,
        string title,
        uint32 cooks
    );

    error EmptyTitle();
    error TitleTooLong();
    error EmojiTooLong();
    error AlreadyCooked(bytes32 key);

    /// @notice Canonical recipe key for a title (normalization applied).
    function recipeKey(string calldata title) public pure returns (bytes32) {
        return keccak256(_transform(bytes(title), true));
    }

    /// @notice Record a cooking stamp for the caller.
    /// @param title Recipe title; normalized for the key, stored trimmed
    ///        with original casing for display.
    /// @param emoji Short emoji shown with the dish.
    function cookIt(string calldata title, string calldata emoji) external {
        bytes memory rawTitle = bytes(title);
        if (rawTitle.length == 0) revert EmptyTitle();
        if (rawTitle.length > MAX_TITLE_BYTES) revert TitleTooLong();
        if (bytes(emoji).length > MAX_EMOJI_BYTES) revert EmojiTooLong();

        bytes32 key = keccak256(_transform(rawTitle, true));
        if (cooked[key][msg.sender]) revert AlreadyCooked(key);
        cooked[key][msg.sender] = true;

        Dish storage dish = dishes[key];
        if (dish.cooks == 0) {
            // First stamp registers the dish (counter starts at 1, so
            // cooks == 0 is only ever true for unregistered dishes;
            // uint32 overflow reverts via checked math instead of wrapping).
            dish.title = string(_transform(rawTitle, false));
            dish.emoji = emoji;
            dish.cooks = 1;
            dishKeys.push(key);
        } else {
            dish.cooks += 1;
        }

        myDishes[msg.sender].push(key);
        emit Cooked(key, msg.sender, dish.title, dish.cooks);
    }

    /// @notice All registered dishes with their keys, insertion order
    ///         (leaderboard source; the frontend sorts). `keys[i]` is the
    ///         recipe key of `list[i]` — one call, so they can never drift.
    function getDishes()
        external
        view
        returns (bytes32[] memory keys, Dish[] memory list)
    {
        keys = dishKeys;
        list = new Dish[](keys.length);
        for (uint256 i = 0; i < keys.length; i++) {
            list[i] = dishes[keys[i]];
        }
    }

    /// @notice Recipe keys recorded by a wallet (My Kitchen source).
    function getMyDishes(address cook) external view returns (bytes32[] memory) {
        return myDishes[cook];
    }

    /// @notice Single dish lookup; unregistered keys return an empty struct.
    function getDish(bytes32 key) external view returns (Dish memory) {
        return dishes[key];
    }

    /// @dev Trims ASCII whitespace and optionally lowercases ASCII letters.
    function _transform(bytes memory input, bool lowercase)
        internal
        pure
        returns (bytes memory)
    {
        uint256 start = 0;
        uint256 end = input.length;
        while (start < end && _isSpace(input[start])) {
            start++;
        }
        while (end > start && _isSpace(input[end - 1])) {
            end--;
        }
        bytes memory out = new bytes(end - start);
        for (uint256 i = 0; i < out.length; i++) {
            bytes1 char = input[start + i];
            if (lowercase && char >= 0x41 && char <= 0x5A) {
                char = bytes1(uint8(char) + 32);
            }
            out[i] = char;
        }
        return out;
    }

    function _isSpace(bytes1 char) internal pure returns (bool) {
        uint8 c = uint8(char);
        return c == 0x20 || c == 0x09 || c == 0x0A || c == 0x0D;
    }
}
