"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const blockchain_1 = require("./blockchain");
const block_1 = require("./block");
var b = new blockchain_1.Blockchain(new block_1.Block(null, new block_1.Data(new block_1.Transaction("A", "B", 50))));
var n_data = new block_1.Data(new block_1.Transaction("B", "C", 40));
n_data.addTransaction(new block_1.Transaction("C", "A", 30));
b.addBlock(n_data);
console.log("ready");
//# sourceMappingURL=index.js.map