import { writeFileSync } from 'fs';
import { SAVE_DIR, BLOCK_HEADER, VERSION, BLOCK_BODY, TRANSACTION } from './constants';
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
    data += Buffer.from('ĴḯŤ').toString('hex');

    // write header
    const header = {
        version: VERSION,
        previousBlockHash,
        merkleTree,
        nonce,
        time: new Date().getTime(), 
    } as BLOCK_HEADER

    data += Buffer.from(stringify(header)).toString('hex');

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

    data += Buffer.from(stringify(body)).toString('hex');

    writeFileSync(SAVE_DIR + '/blk00000.dat', data);
}