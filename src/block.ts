import { createHash } from 'crypto';

export class Block {

    previousBlockHash: string | null;
    data: Data;
    merkleTree: string;
    hash: string;
    nonce: number;

    constructor(previousBlockHash: string | null, data: Data) {
        this.previousBlockHash = previousBlockHash;
        this.data = data;
        this.hash = '';
        this.nonce = -1;
        this.merkleTree = data.getMerkleTree();
    }
    
    mine() {
        var i = 0
        while (this.hash[0] != '0') {
            this.hash = createHash('sha512').update(this.data.getData() + i).digest().toString('hex');
            console.log(this.hash);
            console.log('');
            i++;
        }
        console.log('found');
        this.nonce = i;
    }
}

export class Data {

    transactions: Transaction[];

    constructor(transaction: Transaction) {
        this.transactions = [transaction];
    }

    addTransaction(transaction: Transaction) {
        this.transactions.push(transaction);
    }

    getMerkleTree() {
        var childs = [];
        for (var i = 0; i < this.transactions.length; i++) {
            childs.push(createHash('sha512').update(this.transactions[i].sender + this.transactions[i].receiver + this.transactions[i].amount).digest().toString('hex'));
        }
        while (true) {
            var newChild = [];
            if (childs.length = 1) {
                break;
            }
            if (childs.length % 2 == 0) {
                for (var i = 0; i < childs.length / 2; i++) {
                    newChild.push(createHash('sha512').update(childs[i * 2] + childs[i * 2 + 1]).digest().toString('hex'));
                }
            }
            else {
                for (var i = 0; i < Math.floor(childs.length / 2); i++) {
                    newChild.push(createHash('sha512').update(childs[i * 2] + childs[i * 2 + 1]).digest().toString('hex'));
                }
                newChild.push(createHash('sha512').update(childs[childs.length - 1]).digest().toString('hex'));
            }
            childs = newChild;
        }
        return childs[0];
    }

    getData() {
        let s: string = '';
        for (var i = 0; i < this.transactions.length; i++) {
            s += this.transactions[i].getData();
        }
        return s;
    }
}

export class Transaction {

    sender: string;
    receiver: string;
    amount: number;

    constructor(sender: string, receiver: string, amount: number) {
        this.sender = sender;
        this.receiver = receiver;
        this.amount = amount;
    }

    getData() {
        return this.sender + this.receiver + this.amount;
    }
}