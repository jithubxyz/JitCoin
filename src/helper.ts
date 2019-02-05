import { writeFileSync } from 'fs';
import { SAVE_DIR, BLOCK_HEADER, VERSION, BLOCK_BODY, TRANSACTION, DELIMITER } from './constants';
import { stringify } from 'querystring';
import { Transaction } from './block';

/**
 *
 * @author Flo Dörr
 * @param {string} previousBlockHash
 * @param {string} merkleTree
 * @param {number} nonce
 * @param {Transaction[]} transactions
 */
export const saveBinaryHex = (previousBlockHash: string, merkleTree: string, nonce: number, transactions: Transaction[]) => {
    let data = '';

    // write magic bytes
    const delimiter = Buffer.from(DELIMITER).toString('utf16le');

    // write header
    const header = {
        version: VERSION,
        previousBlockHash,
        merkleTree,
        nonce,
        time: new Date().getTime(), 
    } as BLOCK_HEADER

    // write header
    data += Buffer.from(stringify(header)).toString('utf16le');

    // write transaction count
    data += Buffer.from(transactions.length.toString()).toString('utf16le');

    const trans = [];

    for (const transaction of transactions) {
        trans.push({
            amount: transaction.amount,
            randomHash: transaction.randomHash,
            userId: transaction.userId,
        } as TRANSACTION)
    }
    
    // write body
    const body = {
        transactions: trans
    } as BLOCK_BODY

    // write body
    data += Buffer.from(stringify(body)).toString('utf16le');

    const size = data.length;
    
    const block = delimiter + size + data;

    writeFileSync(SAVE_DIR + '/blk00000.dat', block);
}