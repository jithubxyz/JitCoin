import { Block } from './block';

/**
 * 
 * @author Eleftherios Pavlidis, Flo Dörr
 * @date 2019-01-31
 * @export
 * @class Blockchain
 */
export class Blockchain {

    initBlock: Block;
    blocks: Block[];

    /**
     * Creates an instance of Blockchain.
     * @date 2019-01-31
     * @param {Block} firstBlock
     * @memberof Blockchain
     */
    constructor(firstBlock: Block) {
        this.initBlock = firstBlock;
        this.blocks = [firstBlock];
    }

    /**
     *
     * @date 2019-01-31
     * @param {Block} block
     * @memberof Blockchain
     */
    addBlock(block: Block) {
        this.blocks.push(block);
    }
}