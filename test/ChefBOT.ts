import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getAddress, keccak256 } from "viem";

import { network } from "hardhat";

// Shared anchors: the contract and lib/recipe-key.ts must both equal
// keccak256 of these pre-normalized UTF-8 byte strings.
const KEY_FRIED_RICE =
  "0x52d7d42a467f5ae80877e24ce4b7bdfdcbc7a3ccc2144b23b666d3efbf545395";
const KEY_GARLIC_EGG_FRIED_RICE =
  "0x4f569f3508f0a6af823f4b1c2fcc8506ebfdf818e74fc91451db7e61a0ae4bae";

const encoder = new TextEncoder();

describe("ChefBOT", async () => {
  const { viem } = await network.create();
  const [, alice, bob] = await viem.getWalletClients();

  describe("recipeKey (canonical algorithm parity)", () => {
    it("matches keccak256 of the normalized title", async () => {
      const chefbot = await viem.deployContract("ChefBOT");
      assert.equal(
        await chefbot.read.recipeKey(["Fried Rice"]),
        keccak256(encoder.encode("fried rice")),
      );
      assert.equal(
        await chefbot.read.recipeKey(["Garlic Egg Fried Rice"]),
        keccak256(encoder.encode("garlic egg fried rice")),
      );
    });

    it("resolves capitalization and whitespace variants to one key", async () => {
      const chefbot = await viem.deployContract("ChefBOT");
      assert.equal(await chefbot.read.recipeKey(["Fried Rice"]), KEY_FRIED_RICE);
      assert.equal(await chefbot.read.recipeKey(["fried rice"]), KEY_FRIED_RICE);
      assert.equal(await chefbot.read.recipeKey([" fried rice "]), KEY_FRIED_RICE);
      assert.equal(await chefbot.read.recipeKey(["\tFRIED RICE\n"]), KEY_FRIED_RICE);
      assert.notEqual(await chefbot.read.recipeKey(["  Fried   Rice  "]), KEY_FRIED_RICE); // internal spacing preserved
    });

    it("lowercases ASCII only (documented: no Unicode case folding)", async () => {
      const chefbot = await viem.deployContract("ChefBOT");
      const mixed = await chefbot.read.recipeKey(["Rösti"]);
      const lower = await chefbot.read.recipeKey(["rösti"]);
      const upper = await chefbot.read.recipeKey(["RÖSTI"]);
      assert.equal(mixed, lower);
      assert.notEqual(upper, lower);
    });
  });

  describe("cookIt — first registration", () => {
    it("registers a new dish with cooks = 1 and pushes its key", async () => {
      const chefbot = await viem.deployContract("ChefBOT");
      await chefbot.write.cookIt(["Fried Rice", "🍳"], {
        account: alice.account,
      });

      const dish = await chefbot.read.getDish([KEY_FRIED_RICE]);
      assert.equal(dish.title, "Fried Rice");
      assert.equal(dish.emoji, "🍳");
      assert.equal(dish.cooks, 1);

      const [keys] = await chefbot.read.getDishes();
      assert.deepEqual(keys, [KEY_FRIED_RICE]);
      assert.equal(await chefbot.read.cooked([KEY_FRIED_RICE, alice.account.address]), true);
      assert.equal(await chefbot.read.cooked([KEY_FRIED_RICE, bob.account.address]), false);
      assert.deepEqual(await chefbot.read.getMyDishes([alice.account.address]), [
        KEY_FRIED_RICE,
      ]);
    });

    it("stores the trimmed original-case title for display", async () => {
      const chefbot = await viem.deployContract("ChefBOT");
      await chefbot.write.cookIt(["  Garlic Egg Fried Rice ", "🍳"], {
        account: alice.account,
      });
      const dish = await chefbot.read.getDish([KEY_GARLIC_EGG_FRIED_RICE]);
      assert.equal(dish.title, "Garlic Egg Fried Rice");
      assert.equal(dish.cooks, 1);
    });

    it("emits Cooked with key, cook, title, and updated count", async () => {
      const chefbot = await viem.deployContract("ChefBOT");
      await viem.assertions.emitWithArgs(
        chefbot.write.cookIt(["Fried Rice", "🍳"], { account: alice.account }),
        chefbot,
        "Cooked",
        [KEY_FRIED_RICE, getAddress(alice.account.address), "Fried Rice", 1],
      );
    });
  });

  describe("cookIt — duplicate prevention", () => {
    it("reverts AlreadyCooked for the same wallet using a title variant", async () => {
      const chefbot = await viem.deployContract("ChefBOT");
      await chefbot.write.cookIt(["Fried Rice", "🍳"], {
        account: alice.account,
      });
      await viem.assertions.revertWithCustomErrorWithArgs(
        chefbot.write.cookIt([" FRIED rice ", "🍳"], { account: alice.account }),
        chefbot,
        "AlreadyCooked",
        [KEY_FRIED_RICE],
      );
      // count unchanged after the rejected attempt
      const dish = await chefbot.read.getDish([KEY_FRIED_RICE]);
      assert.equal(dish.cooks, 1);
      assert.deepEqual(await chefbot.read.getMyDishes([alice.account.address]), [
        KEY_FRIED_RICE,
      ]);
    });
  });

  describe("cookIt — shared dish across wallets", () => {
    it("increments the same dish instead of creating a duplicate", async () => {
      const chefbot = await viem.deployContract("ChefBOT");
      await chefbot.write.cookIt(["Fried Rice", "🍳"], {
        account: alice.account,
      });
      await chefbot.write.cookIt(["fried rice", "🍳"], { account: bob.account });

      const dish = await chefbot.read.getDish([KEY_FRIED_RICE]);
      assert.equal(dish.cooks, 2);
      assert.equal(dish.title, "Fried Rice"); // first registrant's display title
      assert.equal((await chefbot.read.getDishes())[0].length, 1);
      assert.equal(await chefbot.read.cooked([KEY_FRIED_RICE, alice.account.address]), true);
      assert.equal(await chefbot.read.cooked([KEY_FRIED_RICE, bob.account.address]), true);
      assert.deepEqual(await chefbot.read.getMyDishes([bob.account.address]), [
        KEY_FRIED_RICE,
      ]);
    });

    it("emits Cooked with the incremented count", async () => {
      const chefbot = await viem.deployContract("ChefBOT");
      await chefbot.write.cookIt(["Fried Rice", "🍳"], {
        account: alice.account,
      });
      await viem.assertions.emitWithArgs(
        chefbot.write.cookIt(["fried rice", "🍳"], { account: bob.account }),
        chefbot,
        "Cooked",
        [KEY_FRIED_RICE, getAddress(bob.account.address), "Fried Rice", 2],
      );
    });
  });

  describe("cookIt — My Kitchen and leaderboard reads", () => {
    it("accumulates multiple distinct recipes per wallet", async () => {
      const chefbot = await viem.deployContract("ChefBOT");
      await chefbot.write.cookIt(["Fried Rice", "🍳"], {
        account: alice.account,
      });
      await chefbot.write.cookIt(["Garlic Egg Fried Rice", "🍳"], {
        account: alice.account,
      });

      assert.deepEqual(await chefbot.read.getMyDishes([alice.account.address]), [
        KEY_FRIED_RICE,
        KEY_GARLIC_EGG_FRIED_RICE,
      ]);

      const [keys, dishes] = await chefbot.read.getDishes();
      assert.deepEqual(keys, [KEY_FRIED_RICE, KEY_GARLIC_EGG_FRIED_RICE]);
      assert.equal(dishes.length, 2);
      assert.deepEqual(
        dishes.map((d) => d.title),
        ["Fried Rice", "Garlic Egg Fried Rice"],
      );
      assert.deepEqual(
        dishes.map((d) => d.cooks),
        [1, 1],
      );
    });

    it("returns an empty list for wallets with no stamps", async () => {
      const chefbot = await viem.deployContract("ChefBOT");
      assert.deepEqual(await chefbot.read.getMyDishes([alice.account.address]), []);
      assert.deepEqual(await chefbot.read.getDishes(), [[], []]);
    });

    it("returns keys and dishes index-aligned in one call (PRD §5)", async () => {
      const chefbot = await viem.deployContract("ChefBOT");
      await chefbot.write.cookIt(["Garlic Egg Fried Rice", "🍳"], { account: alice.account });
      await chefbot.write.cookIt(["Fried Rice", "🍚"], { account: alice.account });
      await chefbot.write.cookIt(["fried rice", "🍚"], { account: bob.account });

      const [keys, dishes] = await chefbot.read.getDishes();
      assert.equal(keys.length, dishes.length);
      for (let i = 0; i < keys.length; i++) {
        assert.equal(keys[i], await chefbot.read.recipeKey([dishes[i]!.title]));
      }
      assert.deepEqual(
        dishes.map((d) => [d.title, d.cooks]),
        [["Garlic Egg Fried Rice", 1], ["Fried Rice", 2]],
      );
    });
  });

  describe("input validation", () => {
    it("rejects an empty title", async () => {
      const chefbot = await viem.deployContract("ChefBOT");
      await viem.assertions.revertWithCustomError(
        chefbot.write.cookIt(["", "🍳"], { account: alice.account }),
        chefbot,
        "EmptyTitle",
      );
    });

    it("rejects a title longer than 64 bytes and accepts exactly 64", async () => {
      const chefbot = await viem.deployContract("ChefBOT");
      const title64 = "a".repeat(64);
      const title65 = "a".repeat(65);
      await chefbot.write.cookIt([title64, "🍳"], { account: alice.account });
      await viem.assertions.revertWithCustomError(
        chefbot.write.cookIt([title65, "🍳"], { account: alice.account }),
        chefbot,
        "TitleTooLong",
      );
      // multibyte boundary: 65 bytes of non-ASCII is still rejected
      const multibyte65 = "é".repeat(33); // 66 bytes UTF-8
      await viem.assertions.revertWithCustomError(
        chefbot.write.cookIt([multibyte65, "🍳"], { account: alice.account }),
        chefbot,
        "TitleTooLong",
      );
    });

    it("rejects an emoji longer than 16 bytes and accepts exactly 16", async () => {
      const chefbot = await viem.deployContract("ChefBOT");
      const emoji16 = "🍳🍳🍳🍳"; // 4 x 4 bytes = 16
      const emoji20 = "🍳🍳🍳🍳🍳"; // 5 x 4 bytes = 20
      await chefbot.write.cookIt(["Fried Rice", emoji16], {
        account: alice.account,
      });
      await viem.assertions.revertWithCustomError(
        chefbot.write.cookIt(["Fried Rice II", emoji20], {
          account: alice.account,
        }),
        chefbot,
        "EmojiTooLong",
      );
    });

    it("rejects a non-existent dish lookup with an empty struct, not a revert", async () => {
      const chefbot = await viem.deployContract("ChefBOT");
      const missing = await chefbot.read.getDish([
        "0x0000000000000000000000000000000000000000000000000000000000000001",
      ]);
      assert.equal(missing.title, "");
      assert.equal(missing.cooks, 0);
    });
  });

  describe("storage minimality", () => {
    it("stores only title, emoji, and cook count per dish", async () => {
      const chefbot = await viem.deployContract("ChefBOT");
      await chefbot.write.cookIt(["Fried Rice", "🍳"], {
        account: alice.account,
      });
      const dish = await chefbot.read.getDish([KEY_FRIED_RICE]);
      // Dish has exactly three fields — no instructions, credentials,
      // or personal data are stored on-chain.
      assert.deepEqual(Object.keys(dish).sort(), ["cooks", "emoji", "title"]);
    });
  });
});
