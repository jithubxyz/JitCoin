import { writeFileSync, statSync, existsSync, mkdirSync, readdirSync, appendFileSync } from 'fs';
import {
  VERSION,
  DELIMITER,
  BLOCKCHAIN_DIR,
  JITCOIN_DIR,
  JITCOIN_FILE,
  MAX_FILE_SIZE,
  JITCOIN_FILE_ZEROS,
  JITCOIN_FILE_STARTER,
  JITCOIN_FILE_ENDING,
} from './constants';
import { stringify } from 'querystring';
import { Transaction } from '../jitcoin/block';
import { BlockHeader, TransactionElement, BlockBody } from './interfaces';
import { createHash } from 'crypto';

/**
 *
 * @author Flo Dörr
 * @param {string} previousBlockHash
 * @param {string} merkleTree
 * @param {number} nonce
 * @param {Transaction[]} transactions
 */
export const saveBinaryHex = (
  previousBlockHash: string,
  merkleTree: string,
  nonce: number,
  transactions: Transaction[],
) => {

  createDir();

  const file = getJitCoinFile();

  // write magic bytes
  const delimiterHex = Buffer.from(DELIMITER).toString('hex');

  // write header
  const header = {
    version: VERSION,
    previousBlockHash,
    merkleTree,
    nonce,
    time: new Date().getTime(),
  } as BlockHeader;

  // write header
  const headerHex = Buffer.from(stringify(header)).toString('hex');

  // write transaction count
  const lengthHex = Buffer.from(transactions.length.toString()).toString(
    'hex',
  );

  const trans = new Array<string>();

  for (const transaction of transactions) {
    trans.push(
      Buffer.from(stringify({
        amount: transaction.amount,
        randomHash: transaction.randomHash,
        userId: transaction.userId,
      } as TransactionElement)).toString('utf8'),
    );
  }

  // write body
  const body = {
    transactions: trans,
  } as BlockBody;

  // write body
  const bodyHex = Buffer.from(stringify(body)).toString('hex');

  const sizeHex = Buffer.from(
    '' + (headerHex.length + lengthHex.length + bodyHex.length),
  ).toString('hex');

  const data = delimiterHex + sizeHex + headerHex + lengthHex + bodyHex;

  appendFileSync(file, data, { encoding: 'hex' });
};

/**
 *
 * @author Flo Dörr
 * @param {string} filename
 * @returns {number} filesize in bytes
 */
const getFilesize = (filename: string): number => {
  const stats = statSync(filename);
  const fileSizeInBytes = stats.size;
  return fileSizeInBytes;
};

/**
 *
 * @author Flo Dörr
 */
const createDir = () => {
  if (!existsSync(JITCOIN_DIR)) {
    mkdirSync(JITCOIN_DIR);
  }
  if (!existsSync(BLOCKCHAIN_DIR)) {
    mkdirSync(BLOCKCHAIN_DIR);
  }
};

/**
 *
 * @author Flo Dörr
 * @returns {string} current file
 */
const getJitCoinFile = (): string => {
  const files = readdirSync(BLOCKCHAIN_DIR);
  if (files.length === 0) {
    const file = BLOCKCHAIN_DIR + '/' + JITCOIN_FILE.replace('$', appendZeros(0));
    writeFileSync(file, '');
    return (file);
  }
  const currentFile = BLOCKCHAIN_DIR + '/' + files[files.length - 1];
  if (getFilesize(currentFile) <= MAX_FILE_SIZE) {
    return currentFile;
  } else {
    const file = BLOCKCHAIN_DIR + '/' + JITCOIN_FILE.replace('$', appendZeros(getLastFileCount(files) + 1));
    writeFileSync(file, '');
    return file;
  }
};

/**
 *
 * @author Flo Dörr
 * @param {number} nmbr
 * @returns {string} name of file
 */
const appendZeros = (nmbr: number): string => {
  return nmbr.toString().padStart(JITCOIN_FILE_ZEROS, '0');
};

/**
 *
 * @author Flo Dörr
 * @param {string[]} files
 * @returns {number}
 */
const getLastFileCount = (files: string[]): number => {
  return +files[files.length - 1].replace(JITCOIN_FILE_STARTER, '').replace(JITCOIN_FILE_ENDING, '');
};

/**
 *
 * @returns recalculated block hash
 * @memberof Block
 */
export const getBlockHash = (data: string, nonce?: number): string => {
  return createHash('sha512')
    .update(`${data}${nonce ? nonce : ''}`)
    .digest()
    .toString('hex');
};