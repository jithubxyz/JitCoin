"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const block_1 = require("./block");
/**
 *
 * @author Eleftherios Pavlidis, Flo Dörr
 * @date 2019-01-31
 * @export
 * @class Blockchain
 */
class Blockchain {
    /**
     * Creates an instance of Blockchain.
     * @date 2019-01-31
     * @param {Block} firstBlock
     * @memberof Blockchain
     */
    constructor(firstBlock) {
        this.initBlock = firstBlock;
        this.blocks = [firstBlock];
    }
    /**
     *
     * @date 2019-01-31
     * @param {Data} data
     * @memberof Blockchain
     */
    addBlock(data) {
        const nBlock = new block_1.Block(this.blocks[this.blocks.length - 1].hash, data);
        this.blocks.push(nBlock);
    }
}
exports.Blockchain = Blockchain;
//# sourceMappingURL=blockchain.js.map