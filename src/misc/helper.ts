import {
  pathExists,
  writeFile,
  stat,
  mkdirp,
  appendFile,
  Stats,
  readdir,
  readFile,
} from 'fs-extra';
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
  DIFFICULTY,
} from './constants';
import { Transaction, Block, Data } from '../jitcoin/block';
import { BlockHeader, TransactionElement, BlockBody } from './interfaces';
import { createHash } from 'crypto';
import { promisify } from 'util';
import { deflate, inflate } from 'zlib';

const write = promisify(writeFile);

const read = promisify(readFile);

const readDir = (path: string): Promise<string[]> =>
  new Promise((resolve, reject) => {
    readdir(path, (err, files) => {
      if (err) {
        reject(err);
      }
      resolve(files);
    });
  });

const stats = (path: string): Promise<Stats> =>
  new Promise((resolve, reject) => {
    stat(path, (err, stats) => {
      if (err) {
        reject(err);
      }
      resolve(stats);
    });
  });

const compress = (buffer: Buffer): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    deflate(buffer, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
};

const decompress = (buffer: Buffer): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    inflate(buffer, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
};

/**
 *
 * @author Flo Dörr
 * @param {string} previousBlockHash
 * @param {string} merkleTree
 * @param {number} nonce
 * @param {Data} data
 */
export const saveBinaryHex = (
  previousBlockHash: string | null,
  merkleTree: string,
  nonce: number,
  data: Data,
) => {
  return new Promise(async resolve => {
    createDir();

    const file = await getJitCoinFile();

    const headerCompressed = await compress(
      Buffer.from(
        JSON.stringify(
          getJSONHeader(
            previousBlockHash,
            merkleTree,
            nonce,
            undefined,
            getBlockHash(data.getData(), nonce),
          ),
        ),
        'utf8',
      ),
    );

    const headerSize = headerCompressed.byteLength;

    const bodyCompressed = await compress(
      Buffer.from(JSON.stringify(getJSONBody(data.transactions)), 'utf8'),
    );

    const bodySize = bodyCompressed.byteLength;

    await appendFile(file, DELIMITER);
    await appendFile(file, headerSize);
    await appendFile(file, headerCompressed);
    await appendFile(file, bodySize);
    await appendFile(file, bodyCompressed);

    resolve();
  });
};

/**
 *
 * @author Flo Dörr
 * @returns {Promise<Block | null>}
 */
export const getLastBlock = (): Promise<Block | null> => {
  return new Promise(async resolve => {
    if (await jitcoinPathExists()) {
      const file = await getJitCoinFile();

      const data: Buffer = (await read(file)) as Buffer;

      if (data.toString('utf8') !== '') {
        // removing delimiter from data
        const lastBlock = data.slice(
          data.lastIndexOf(DELIMITER, undefined, 'utf8'),
          data.byteLength,
        );
        const delimiterPostion = Buffer.from(DELIMITER).byteLength;

        // isolating the header

        const headerLengthBuffer = lastBlock.slice(
          delimiterPostion,
          data.indexOf('x'),
        );

        const headerLength = +headerLengthBuffer.toString('utf8');

        const headerStart = delimiterPostion + headerLengthBuffer.byteLength;

        const headerEnd = headerStart + headerLength;

        const header = lastBlock.slice(headerStart, headerEnd);

        const decompressedHeader = JSON.parse(
          (await decompress(header)).toString('utf8'),
        );

        // isolating the body

        const bodyLengthBuffer = lastBlock.slice(
          headerEnd,
          lastBlock.indexOf('x', headerEnd),
        );

        const bodyLength = +bodyLengthBuffer.toString('utf8');

        const bodyStart = headerEnd + bodyLengthBuffer.byteLength;

        const bodyEnd = bodyStart + bodyLength;

        const body = lastBlock.slice(bodyStart, bodyEnd);

        const decompressedBody = JSON.parse(
          (await decompress(body)).toString('utf8'),
        );

        // creating Block of the data gathered of the file

        let blockData: Data | null = null;

        for (const transactionItem of decompressedBody.transactions) {
          const transaction = new Transaction(
            transactionItem.userId,
            transactionItem.randomHash,
            transactionItem.amount,
          );
          if (blockData === null) {
            blockData = new Data(transaction);
          } else {
            blockData.addTransaction(transaction);
          }
        }

        // recalculating the hash with the given nonce

        let hash: string | undefined = undefined;

        if (decompressedHeader.nonce !== -1) {
          hash = getBlockHash(
            blockData!!.getData(),
            decompressedHeader.nonce as number,
          );
        }

        const block = new Block(
          decompressedHeader.previousBlockHash,
          blockData!!,
          decompressedHeader.nonce,
          hash,
        );

        resolve(block);
      } else {
        resolve(null);
      }
    } else {
      resolve(null);
    }
  });
};

/**
 *
 * @author Flo Dörr
 * @returns {Promise<Block | null>}
 */
export const updateLastBlockData = (
  transaction: Transaction,
): Promise<boolean> => {
  return new Promise(async resolve => {
    if (await jitcoinPathExists()) {
      // get the last block
      const block = (await getLastBlock())!!;

      // delete the last block from file
      await deleteLastBlock();

      // adding the new transaction
      block.data.addTransaction(transaction);

      // saving the block to the disk
      await block.save();

      // resetting nonce and hash
      block.nonce = -1;
      block.hash = '';
      resolve(true);
    } else {
      resolve(false);
    }
  });
};

/**
 *
 * @author Flo Dörr
 */
const deleteLastBlock = (): Promise<boolean> => {
  return new Promise(async resolve => {
    const file = await getJitCoinFile();

    const data: Buffer = (await read(file)) as Buffer;

    if (data.toString('utf8') !== '') {
      const previousData = data.slice(
        0,
        data.lastIndexOf(DELIMITER, undefined, 'utf8'),
      );

      await writeFile(file, previousData);
      resolve(true);
    } else {
      resolve(false);
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
 * @param {BlockHeader} header
 * @returns {JSON} Header Object
 */
export const getJSONHeader = (
  previousBlockHash: string | null,
  merkleTree: string,
  nonce: number,
  time: undefined | number,
  hash: string | undefined,
): BlockHeader => {
  const header = {
    version: VERSION,
    previousBlockHash,
    merkleTree,
    nonce,
    time: time ? time : new Date().getTime(),
    hash,
  } as BlockHeader;

  return header;
};

/**
 *
 * @author Flo Dörr
 * @param {BlockHeader} header
 * @returns {JSON} Header Object
 */
export const getJSONHeaderFromBlock = (
  block: Block,
  time?: number,
): BlockHeader => {
  const header = {
    version: VERSION,
    previousBlockHash: block.previousBlockHash,
    merkleTree: block.merkleTree,
    nonce: block.nonce,
    time: time ? time : new Date().getTime(),
    hash: getBlockHash(block.data.getData(), block.nonce),
  } as BlockHeader;

  return header;
};

/**
 *
 * @author Flo Dörr
 * @param {BlockHeader} header
 * @returns {JSON} Header Object
 */
export const getJSONBody = (transactions: Transaction[]): BlockBody => {
  const trans = [];

  for (const transaction of transactions) {
    trans.push({
      amount: transaction.amount,
      randomHash: transaction.randomHash,
      userId: transaction.userId,
    } as TransactionElement);
  }

  // write body
  const body = {
    transactions: trans,
  } as BlockBody;

  return body;
};

/**
 *
 * @author Flo Dörr
 */
const createDir = async () => {
  if (!(await pathExists(JITCOIN_DIR))) {
    await mkdirp(JITCOIN_DIR);
  }
  if (!(await pathExists(BLOCKCHAIN_DIR))) {
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
    const file =
      BLOCKCHAIN_DIR + '/' + JITCOIN_FILE.replace('$', appendZeros(0));
    await write(file, '');
    return file;
  }
  const currentFile = BLOCKCHAIN_DIR + '/' + files[files.length - 1];
  if ((await getFilesize(currentFile)) <= MAX_FILE_SIZE) {
    return currentFile;
  } else {
    const file =
      BLOCKCHAIN_DIR +
      '/' +
      JITCOIN_FILE.replace('$', appendZeros(getLastFileCount(files) + 1));
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
  return +files[files.length - 1]
    .replace(JITCOIN_FILE_STARTER, '')
    .replace(JITCOIN_FILE_ENDING, '');
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

/**
 *
 * @author Flo Dörr
 * @returns {string} random hash
 */
export const getRandomHash = (): string => {
  const currentDate = new Date().valueOf().toString();
  const random = Math.random().toString();
  return createHash('sha512')
    .update(currentDate + random)
    .digest('hex');
};

/**
 *
 * @author Flo Dörr
 * @param {string} hash
 * @returns {boolean} true if hash was mined
 */
export const isHashMined = (hash: string): boolean => {
  return hash.substring(0, DIFFICULTY) === getZeroString();
};

/**
 *
 * @author Flo Dörr
 * @returns {string} difficulty as string
 */
export const getZeroString = (): string => {
  return ''.padEnd(DIFFICULTY, '0');
};
