import { createHash } from 'crypto';
import { stringify } from 'querystring';

/**
 *
 * 
 * @author Eleftherios Pavlidis, Flo Dörr
 * @date 2019-01-31
 * @export
 * @class Block
 */
export class Block {

    previousBlockHash: string | null;
    data: Data;
    merkleTree: string;
    hash: string;
    nonce: number;

    /**
     * Creates an instance of Block.
     * 
     * @date 2019-01-31
     * @param {(string | null)} previousBlockHash
     * @param {Data} data
     * @memberof Block
     */
    constructor(previousBlockHash: string | null, data: Data) {
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
        console.log('trying to find nonce...');
        while (this.hash[0] !== '0' || this.hash[1] !== '0' || this.hash[2] !== '0' || this.hash[3] !== '0' || this.hash[4] !== '0') {
            this.nonce++;
            this.hash = createHash('sha512').update(this.data.getData() + this.nonce).digest().toString('hex');
        }
        console.log('nonce found! it\'s ' + this.nonce);
        //console.log('the hash is: ' + this.hash);
    }

    /**
     *
     *
     * @returns 
     * @memberof Block
     */
    getBlockHash() {
        return createHash('sha512').update(this.data.getData() + this.nonce).digest().toString('hex');
    }
}

/**
 *
 * @author Eleftherios Pavlidis, Flo Dörr
 * @date 2019-01-31
 * @export
 * @class Data
 */
export class Data {

    transactions: Transaction[];

    /**
     * Creates an instance of Data.
     * @date 2019-01-31
     * @param {Transaction} transaction
     * @memberof Data
     */
    constructor(transaction: Transaction) {
        this.transactions = [transaction];
    }

    /**
     *
     * @date 2019-01-31
     * @param {Transaction} transaction
     * @memberof Data
     */
    addTransaction(transaction: Transaction) {
        this.transactions.push(transaction);
    }

    /**
     *
     * @date 2019-01-31
     * @returns {string} merkle tree
     * @memberof Data
     */
    getMerkleTree(): string {
        let childs = [];
        for (let i = 0; i < this.transactions.length; i++) {
            childs.push(createHash('sha512').update(this.transactions[i].toString()).digest().toString('hex'));
        }
        while (true) {
            const newChild = [];
            if (childs.length === 1) {
                break;
            }
            if (childs.length % 2 === 0) {
                for (let i = 0; i < childs.length / 2; i++) {
                    newChild.push(createHash('sha512').update(childs[i * 2] + childs[i * 2 + 1]).digest().toString('hex'));
                }
            }
            else {
                for (let i = 0; i < Math.floor(childs.length / 2); i++) {
                    newChild.push(createHash('sha512').update(childs[i * 2] + childs[i * 2 + 1]).digest().toString('hex'));
                }
                newChild.push(createHash('sha512').update(childs[childs.length - 1]).digest().toString('hex'));
            }
            childs = newChild;
        }
        return childs[0];
    }

    /**
     *
     * @date 2019-01-31
     * @returns {[string]} data concated in a string
     * @memberof Data
     */
    getData(): string {
        const data = [];
        for (let i = 0; i < this.transactions.length; i++) {
            data.push(this.transactions[i].getData());
        }
        return stringify(data);
    }
}

/**
 *
 * @author Eleftherios Pavlidis, Flo Dörr
 * @date 2019-01-31
 * @export
 * @class Transaction
 */
export class Transaction {

    userId: string;
    randomHash: string;
    amount: number;

    /**
     * Creates an instance of Transaction.
     * @date 2019-01-31
     * @param {string} userId the id of the user issuing the transaction
     * @param {string} randomHash the randomly by every user generate user
     * @param {number} amount the amount of JitCoins to be betted
     * @memberof Transaction
     */
    constructor(userId: string, randomHash: string, amount: number) {
        this.userId = userId;
        this.randomHash = randomHash;
        this.amount = amount;
    }

    /**
     *
     * @date 2019-01-31
     * @returns {string} returns stringified data
     * @memberof Transaction
     */
    getData(): string {
        return stringify(this);
    }
}