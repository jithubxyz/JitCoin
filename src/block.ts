import { createHash } from 'crypto';

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
        let i = 0;
        while (this.hash[0] !== '0') {
            this.hash = createHash('sha512').update(this.data.getData() + i).digest().toString('hex');
            console.log(this.hash);
            console.log('');
            i++;
        }
        console.log('found');
        this.nonce = i;
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
            childs.push(createHash('sha512').update(this.transactions[i].sender + this.transactions[i].receiver + this.transactions[i].amount).digest().toString('hex'));
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
     * @returns {string} data
     * @memberof Data
     */
    getData(): string {
        let s = '';
        for (let i = 0; i < this.transactions.length; i++) {
            s += this.transactions[i].getData();
        }
        return s;
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

    sender: string;
    receiver: string;
    amount: number;

    /**
     * Creates an instance of Transaction.
     * @date 2019-01-31
     * @param {string} sender
     * @param {string} receiver
     * @param {number} amount
     * @memberof Transaction
     */
    constructor(sender: string, receiver: string, amount: number) {
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
    getData(): string {
        return this.sender + this.receiver + this.amount;
    }
}