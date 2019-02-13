import { pathExists, writeFile, stat, mkdirp, appendFile, Stats, readdir, readFile } from 'fs-extra';
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
import { Transaction, Block } from '../jitcoin/block';
import { BlockHeader, TransactionElement, BlockBody } from './interfaces';
import { createHash } from 'crypto';
import { promisify } from 'util';

const write = promisify(writeFile);
const read = promisify(readFile);
const readDir = (path: string): Promise<string[]> => new Promise((resolve, reject) => {
  readdir(path, (err, files) => {
    if (err) {
      reject(err);
    }
    resolve(files);
  });
});
const stats = (path: string): Promise<Stats> => new Promise((resolve, reject) => {
  stat(path, (err, stats) => {
    if (err) {
      reject(err);
    }
    resolve(stats);
  });
});
const append = (path: string, data: string, options: { encoding: string }): Promise<Stats> => new Promise((resolve, reject) => {
  appendFile(path, data, options, (err) => {
    if (err) {
      reject(err);
    }
    resolve();
  });
});

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
  return new Promise(async resolve => {
    createDir();

    const file = await getJitCoinFile();

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

    await append(file, data, { encoding: 'hex' });
    resolve();
  });
};

const getLastBlock = (): Promise<Block | null> => {
  return new Promise(async resolve => {
    if (jitcoinPathExists) {
      const file = await getJitCoinFile();
      const data = await read(JITCOIN_DIR + '/' + file);
      console.log(data);
    } else {
      resolve(null);
    }
  });
};

/**
 *
 * @author Flo Dörr
 * @param {string} filename
 * @returns {number} filesize in bytes
 */
const getFilesize = async (filename: string): Promise<number> => {
  const size = await stats(filename);
  const fileSizeInBytes = size.size;
  return fileSizeInBytes;
};

/**
 *
 * @author Flo Dörr
 */
const createDir = async () => {
  if (!(await pathExists(JITCOIN_DIR))) {
    await mkdirp(JITCOIN_DIR);
  }
  if (!await pathExists(BLOCKCHAIN_DIR)) {
    await mkdirp(BLOCKCHAIN_DIR);
  }
};

const jitcoinPathExists = async () => {
  return (await pathExists(JITCOIN_DIR)) && (await pathExists(BLOCKCHAIN_DIR));
};

/**
 *
 * @author Flo Dörr
 * @returns {string} current file
 */
const getJitCoinFile = async (): Promise<string> => {
  const files = await readDir(BLOCKCHAIN_DIR);
  if (files.length === 0) {
    const file = BLOCKCHAIN_DIR + '/' + JITCOIN_FILE.replace('$', appendZeros(0));
    await write(file, '');
    return file;
  }
  const currentFile = BLOCKCHAIN_DIR + '/' + files[files.length - 1];
  if (await getFilesize(currentFile) <= MAX_FILE_SIZE) {
    return currentFile;
  } else {
    const file = BLOCKCHAIN_DIR + '/' + JITCOIN_FILE.replace('$', appendZeros(getLastFileCount(files) + 1));
    await write(file, '');
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