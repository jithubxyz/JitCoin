import { Block, Data } from './block';

export class Blockchain {

    initBlock: Block;
    blocks: Block[];

    constructor(firstBlock: Block) {
        this.initBlock = firstBlock;
        this.blocks = [firstBlock];
    }

    addBlock(data: Data) {
        var nBlock = new Block(this.blocks[this.blocks.length - 1].hash, data);
        nBlock.mine();
        this.blocks.push(nBlock);
    }
}