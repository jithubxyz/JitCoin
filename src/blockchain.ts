import { Block, Data } from './block';

export class Blockchain {

    initBlock: Block;
    blocks: Block[];

    constructor(firstBlock: Block) {
        this.initBlock = firstBlock;
        this.blocks = [firstBlock];
    }

    addBlock(data: Data){
      var n_block = new Block(this.blocks[this.blocks.length-1].hash, data)
      n_block.mine()
      this.blocks.push(n_block)
    }
}