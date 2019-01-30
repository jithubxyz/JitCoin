import { Block, Data } from './block';
export declare class Blockchain {
    initBlock: Block;
    blocks: Block[];
    constructor(firstBlock: Block);
    addBlock(data: Data): void;
}
