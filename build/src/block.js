"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
/**
 *
 *
 * @author Eleftherios Pavlidis, Flo Dörr
 * @date 2019-01-31
 * @export
 * @class Block
 */
class Block {
    /**
     * Creates an instance of Block.
     *
     * @date 2019-01-31
     * @param {(string | null)} previousBlockHash
     * @param {Data} data
     * @memberof Block
     */
    constructor(previousBlockHash, data) {
        this.previousBlockHash = previousBlockHash;
        this.data = data;
        this.hash = '';
        this.nonce = -1;
        this.merkleTree = data.getMerkleTree();
        this.mine();
    }
    /**
     * mines the nonce
     *
     * @date 2019-01-31
     * @memberof Block
     */
    mine() {
        let i = 0;
        while (this.hash[0] !== '0') {
            this.hash = crypto_1.createHash('sha512').update(this.data.getData() + i).digest().toString('hex');
            console.log(this.hash);
            console.log('');
            i++;
        }
        console.log('found');
        this.nonce = i;
    }
}
exports.Block = Block;
/**
 *
 * @author Eleftherios Pavlidis, Flo Dörr
 * @date 2019-01-31
 * @export
 * @class Data
 */
class Data {
    /**
     * Creates an instance of Data.
     * @date 2019-01-31
     * @param {Transaction} transaction
     * @memberof Data
     */
    constructor(transaction) {
        this.transactions = [transaction];
    }
    /**
     *
     * @date 2019-01-31
     * @param {Transaction} transaction
     * @memberof Data
     */
    addTransaction(transaction) {
        this.transactions.push(transaction);
    }
    /**
     *
     * @date 2019-01-31
     * @returns {string} merkle tree
     * @memberof Data
     */
    getMerkleTree() {
        let childs = [];
        for (let i = 0; i < this.transactions.length; i++) {
            childs.push(crypto_1.createHash('sha512').update(this.transactions[i].sender + this.transactions[i].receiver + this.transactions[i].amount).digest().toString('hex'));
        }
        while (true) {
            const newChild = [];
            if (childs.length === 1) {
                break;
            }
            if (childs.length % 2 === 0) {
                for (let i = 0; i < childs.length / 2; i++) {
                    newChild.push(crypto_1.createHash('sha512').update(childs[i * 2] + childs[i * 2 + 1]).digest().toString('hex'));
                }
            }
            else {
                for (let i = 0; i < Math.floor(childs.length / 2); i++) {
                    newChild.push(crypto_1.createHash('sha512').update(childs[i * 2] + childs[i * 2 + 1]).digest().toString('hex'));
                }
                newChild.push(crypto_1.createHash('sha512').update(childs[childs.length - 1]).digest().toString('hex'));
            }
            childs = newChild;
        }
        return childs[0];
    }
    /**
     *
     * @date 2019-01-31
     * @returns {string} data
     * @memberof Data
     */
    getData() {
        let s = '';
        for (let i = 0; i < this.transactions.length; i++) {
            s += this.transactions[i].getData();
        }
        return s;
    }
}
exports.Data = Data;
/**
 *
 * @author Eleftherios Pavlidis, Flo Dörr
 * @date 2019-01-31
 * @export
 * @class Transaction
 */
class Transaction {
    /**
     * Creates an instance of Transaction.
     * @date 2019-01-31
     * @param {string} sender
     * @param {string} receiver
     * @param {number} amount
     * @memberof Transaction
     */
    constructor(sender, receiver, amount) {
        this.sender = sender;
        this.receiver = receiver;
        this.amount = amount;
    }
    /**
     *
     * @date 2019-01-31
     * @returns {string} data arranged as string
     * @memberof Transaction
     */
    getData() {
        return this.sender + this.receiver + this.amount;
    }
}
exports.Transaction = Transaction;
//# sourceMappingURL=block.js.map