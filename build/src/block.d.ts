export declare class Block {
    previousBlockHash: string | null;
    data: Data;
    merkleTree: string;
    hash: string;
    nonce: number;
    constructor(previousBlockHash: string | null, data: Data);
    mine(): void;
}
export declare class Data {
    transactions: Transaction[];
    constructor(transaction: Transaction);
    addTransaction(transaction: Transaction): void;
    getMerkleTree(): string;
    getData(): string;
}
export declare class Transaction {
    sender: string;
    receiver: string;
    amount: number;
    constructor(sender: string, receiver: string, amount: number);
    getData(): string;
}
