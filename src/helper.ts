import { writeFileSync, statSync, existsSync, mkdirSync, readdirSync, appendFileSync } from 'fs';
import {
  BLOCK_HEADER,
  VERSION,
  BLOCK_BODY,
  TRANSACTION,
  DELIMITER,
  BLOCKCHAIN_DIR,
  JITCOIN_DIR,
  JITCOIN_FILE,
  MAX_FILE_SIZE,
  JITCOIN_FILE_ZEROS,
} from './constants';
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
  } as BLOCK_HEADER;

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
      } as TRANSACTION)).toString('utf8'),
    );
  }

  // write body
  const body = {
    transactions: trans,
  } as BLOCK_BODY;

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
  if(!existsSync(JITCOIN_DIR)){
    mkdirSync(JITCOIN_DIR);
  }
  if(!existsSync(BLOCKCHAIN_DIR)){
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
  if(files.length === 0){
    const file = BLOCKCHAIN_DIR + '/' + JITCOIN_FILE.replace('$', appendZeros(0));
    writeFileSync(file, '');
    return(file);
  }
  const currentFile = BLOCKCHAIN_DIR + '/' + files[files.length - 1];
  if(getFilesize(currentFile) <= MAX_FILE_SIZE){
    return currentFile;
  }else{
    const file = BLOCKCHAIN_DIR + '/' + JITCOIN_FILE.replace('$', appendZeros(files.length));
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
  let file = '';
  for(let i = 0; i < JITCOIN_FILE_ZEROS - nmbr.toString().length; i++){
    file += '0';
  }
  return file + nmbr.toString();
};