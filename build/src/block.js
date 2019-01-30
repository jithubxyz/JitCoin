"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
class Block {
    constructor(previousBlockHash, data) {
        this.previousBlockHash = previousBlockHash;
        this.data = data;
        this.hash = "";
        this.nonce = -1;
        this.merkleTree = data.getMerkleTree();
    }
    mine() {
        var i = 0;
        while (this.hash[0] != "0") {
            this.hash = crypto_1.createHash('sha512').update(this.data.getData() + i).digest().toString('hex');
            console.log(this.hash);
            console.log('');
            i++;
        }
        console.log("found");
        this.nonce = i;
    }
}
exports.Block = Block;
class Data {
    constructor(transaction) {
        this.transactions = [transaction];
    }
    addTransaction(transaction) {
        this.transactions.push(transaction);
    }
    getMerkleTree() {
        var childs = [];
        for (var i = 0; i < this.transactions.length; i++) {
            childs.push(crypto_1.createHash('sha512').update(this.transactions[i].sender + this.transactions[i].receiver + this.transactions[i].amount).digest().toString('hex'));
        }
        while (true) {
            var newChild = [];
            if (childs.length = 1) {
                break;
            }
            if (childs.length % 2 == 0) {
                for (var i = 0; i < childs.length / 2; i++) {
                    newChild.push(crypto_1.createHash('sha512').update(childs[i * 2] + childs[i * 2 + 1]).digest().toString('hex'));
                }
            }
            else {
                for (var i = 0; i < Math.floor(childs.length / 2); i++) {
                    newChild.push(crypto_1.createHash('sha512').update(childs[i * 2] + childs[i * 2 + 1]).digest().toString('hex'));
                }
                newChild.push(crypto_1.createHash('sha512').update(childs[childs.length - 1]).digest().toString('hex'));
            }
            childs = newChild;
        }
        return childs[0];
    }
    getData() {
        let s = '';
        for (var i = 0; i < this.transactions.length; i++) {
            s += this.transactions[i].getData();
        }
        return s;
    }
}
exports.Data = Data;
class Transaction {
    constructor(sender, receiver, amount) {
        this.sender = sender;
        this.receiver = receiver;
        this.amount = amount;
    }
    getData() {
        return this.sender + this.receiver + this.amount;
    }
}
exports.Transaction = Transaction;
//# sourceMappingURL=block.js.map