/**
 *
 *
 * @author Eleftherios Pavlidis, Flo Dörr
 * @date 2019-01-31
 * @export
 * @class Block
 */
export declare class Block {
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
    constructor(previousBlockHash: string | null, data: Data);
    /**
     * mines the nonce
     *
     * @date 2019-01-31
     * @memberof Block
     */
    mine(): void;
}
/**
 *
 * @author Eleftherios Pavlidis, Flo Dörr
 * @date 2019-01-31
 * @export
 * @class Data
 */
export declare class Data {
    transactions: Transaction[];
    /**
     * Creates an instance of Data.
     * @date 2019-01-31
     * @param {Transaction} transaction
     * @memberof Data
     */
    constructor(transaction: Transaction);
    /**
     *
     * @date 2019-01-31
     * @param {Transaction} transaction
     * @memberof Data
     */
    addTransaction(transaction: Transaction): void;
    /**
     *
     * @date 2019-01-31
     * @returns {string} merkle tree
     * @memberof Data
     */
    getMerkleTree(): string;
    /**
     *
     * @date 2019-01-31
     * @returns {string} data
     * @memberof Data
     */
    getData(): string;
}
/**
 *
 * @author Eleftherios Pavlidis, Flo Dörr
 * @date 2019-01-31
 * @export
 * @class Transaction
 */
export declare class Transaction {
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
    constructor(sender: string, receiver: string, amount: number);
    /**
     *
     * @date 2019-01-31
     * @returns {string} data arranged as string
     * @memberof Transaction
     */
    getData(): string;
}
