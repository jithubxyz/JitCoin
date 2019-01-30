"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const block_1 = require("./block");
class Blockchain {
    constructor(firstBlock) {
        this.initBlock = firstBlock;
        this.blocks = [firstBlock];
    }
    addBlock(data) {
        var n_block = new block_1.Block(this.blocks[this.blocks.length - 1].hash, data);
        n_block.mine();
        this.blocks.push(n_block);
    }
}
exports.Blockchain = Blockchain;
//# sourceMappingURL=blockchain.js.map