import { Block, Data } from './block';
/**
 *
 * @author Eleftherios Pavlidis, Flo Dörr
 * @date 2019-01-31
 * @export
 * @class Blockchain
 */
export declare class Blockchain {
    initBlock: Block;
    blocks: Block[];
    /**
     * Creates an instance of Blockchain.
     * @date 2019-01-31
     * @param {Block} firstBlock
     * @memberof Blockchain
     */
    constructor(firstBlock: Block);
    /**
     *
     * @date 2019-01-31
     * @param {Data} data
     * @memberof Blockchain
     */
    addBlock(data: Data): void;
}
