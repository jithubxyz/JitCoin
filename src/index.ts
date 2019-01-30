import { Blockchain } from './blockchain';
import { Block, Data, Transaction } from './block';

var b = new Blockchain(new Block(null, new Data(new Transaction("A", "B", 50))))
var n_data = new Data(new Transaction("B", "C", 40))
n_data.addTransaction(new Transaction("C", "A", 30))
b.addBlock(n_data)
console.log("ready")