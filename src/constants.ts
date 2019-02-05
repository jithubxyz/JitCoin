/**
 * @author Flo Dörr
 * @date 2019-02-04
 */

export const VERSION: number = 1;

export const SAVE_DIR: string = './.jitcoin/blockchain';

// uncommon string to delimit the blocks
export const DELIMITER: string = 'ĴḯŤ';

export interface BLOCK_HEADER {
    version: number;
    previousBlockHash: string;
    merkleTree: string;
    time: number;
    nonce: number;
};

export interface BLOCK_BODY {
    transactions: [TRANSACTION];
}

export interface TRANSACTION {
    userId: string;
    randomHash: string;
    amount: number;
}