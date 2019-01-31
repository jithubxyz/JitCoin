import { Blockchain } from './blockchain';
import { Block, Data, Transaction } from './block';

const b = new Blockchain(new Block(null, new Data(new Transaction("A", "B", 50))));
const nData = new Data(new Transaction("B", "C", 40));
nData.addTransaction(new Transaction("C", "A", 30));
b.addBlock(nData);
console.log("ready");