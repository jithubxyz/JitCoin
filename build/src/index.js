"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const blockchain_1 = require("./blockchain");
const block_1 = require("./block");
const b = new blockchain_1.Blockchain(new block_1.Block(null, new block_1.Data(new block_1.Transaction("A", "B", 50))));
const nData = new block_1.Data(new block_1.Transaction("B", "C", 40));
nData.addTransaction(new block_1.Transaction("C", "A", 30));
b.addBlock(nData);
console.log("ready");
//# sourceMappingURL=index.js.map