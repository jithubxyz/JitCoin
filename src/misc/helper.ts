import {
  pathExists,
  writeFile,
  stat,
  mkdirp,
  appendFile,
  Stats,
  readdir,
  readFile,
  exists,
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
  WALLET_DIR,
  PUBLIC_KEY_FILE_ENDING,
  PRIVATE_KEY_FILE_ENDING,
  WALLET_FILE_STARTER,
} from './constants';
import { Transaction, Block, Data } from '../jitcoin/block';
import { BlockHeader, TransactionElement, BlockBody } from './interfaces';
import {
  createHash,
  generateKeyPair,
  createPrivateKey,
  RSAKeyPairOptions,
  createSign,
  createVerify,
  createPublicKey,
} from 'crypto';
import { deflate, inflate } from 'zlib';

const write = (file: string, data: string | Buffer): Promise<boolean> =>
  new Promise(resolve => {
    writeFile(file, data, (err) => {
      if(err){
        resolve(false);
      }else{
        resolve(true);
      }
    });
  });

const fileExists = (path: string): Promise<boolean> =>
  new Promise(resolve => {
    exists(path, (exists) => {
      resolve(exists);
    });
  });

const read = (path: string): Promise<Buffer> =>
  new Promise(resolve => {
    readFile(path, (err, data) => {
      if (err) {
        resolve(undefined);
      } else {
        resolve(data);
      }
    });
  });

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
const key = (type: "rsa", options: RSAKeyPairOptions<"pem", "pem">): Promise<{privateKey: string, publicKey: string} | null> =>
  new Promise(resolve => {
    generateKeyPair(type, options, (err, publicKey, privateKey) => {
      if(err){
        resolve(null);
      }else{
        resolve({privateKey, publicKey});
      }
    });
  });

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

        resolve(await parseFileData(lastBlock));
      } else {
        resolve(null);
      }
    } else {
      resolve(null);
    }
  });
};

export const parseFileData = (data: Buffer): Promise<Block> => {
  return new Promise(async resolve => {
    const delimiterPostion = Buffer.from(DELIMITER).byteLength;

    // isolating the header

    const headerLengthBuffer = data.slice(delimiterPostion, data.indexOf('x'));
    const headerLength = +headerLengthBuffer.toString('utf8');
    const headerStart = delimiterPostion + headerLengthBuffer.byteLength;
    const headerEnd = headerStart + headerLength;
    const header = data.slice(headerStart, headerEnd);
    const decompressedHeader = JSON.parse(
      (await decompress(header)).toString('utf8'),
    );

    // isolating the body

    const bodyLengthBuffer = data.slice(
      headerEnd,
      data.indexOf('x', headerEnd),
    );
    const bodyLength = +bodyLengthBuffer.toString('utf8');
    const bodyStart = headerEnd + bodyLengthBuffer.byteLength;
    const bodyEnd = bodyStart + bodyLength;
    const body = data.slice(bodyStart, bodyEnd);
    const decompressedBody = JSON.parse(
      (await decompress(body)).toString('utf8'),
    );

    // creating Block of the data gathered of the file

    let blockData: Data | null = null;

    for (const transactionItem of decompressedBody.transactions) {
      const transaction = new Transaction(
        transactionItem.publicKey,
        transactionItem.randomHash,
        transactionItem.amount,
        transactionItem.signature
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

      // resetting nonce and hash
      block.nonce = -1;
      block.hash = '';

      // saving the block to the disk
      await block.save();
      resolve(true);
    } else {
      resolve(false);
    }
  });
};

/**
 *
 * @author Flo Dörr
 * @returns {Promise<Block | null>}
 */
export const updateLastBlock = (block: Block): Promise<boolean> => {
  return new Promise(async resolve => {
    if (await jitcoinPathExists()) {
      // delete the last block from file
      if (await deleteLastBlock()) {
        // saving the block to the disk
        await block.save();
        resolve(true);
      } else {
        resolve(false);
      }
    } else {
      resolve(false);
    }
  });
};

/**
 *
 * @author Flo Dörr
 */
export const deleteLastBlock = (): Promise<boolean> => {
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
      signature: transaction.signature,
      publicKey: transaction.publicKey,
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
  if (!(await pathExists(WALLET_DIR))) {
    await mkdirp(WALLET_DIR);
  }
};

const jitcoinPathExists = async () => {
  return (
    (await pathExists(JITCOIN_DIR)) &&
    (await pathExists(BLOCKCHAIN_DIR)) &&
    (await pathExists(WALLET_DIR))
  );
};

/**
 *
 * @author Flo Dörr
 * @returns {string} current file
 */
export const getJitCoinFile = async (): Promise<string> => {
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
export const isHashMined = (hash: string | null): boolean => {
  if (hash === null) {
    return true;
  } else {
    return hash.substring(0, DIFFICULTY) === getZeroString();
  }
};

/**
 *
 * @author Flo Dörr
 * @returns {string} difficulty as string
 */
export const getZeroString = (): string => {
  return ''.padEnd(DIFFICULTY, '0');
};

/**
 *
 * @author Flo Dörr
 * @returns {number | null} length of lastBlockFile
 */
export const lengthLastBlockFile = (
  file: string | null,
): Promise<number | null> => {
  return new Promise(async resolve => {
    if (file === null) {
      file = await lastJitCoinFile();
    }

    const data: Buffer = await read(file);

    if (data !== undefined) {
      resolve(data.toString().split(DELIMITER).length - 1);
    } else {
      resolve(null);
    }
  });
};

/**
 *
 * @author Flo Dörr
 * @returns {Block[] | null} Array of blocks (the block with index 0 is the top one)
 */
export const getFileAsArray = (
  file?: string | null,
): Promise<Block[] | null> => {
  return new Promise(async resolve => {
    if (file === null || file === undefined) {
      file = await lastJitCoinFile();
    }

    let data = await read(file);

    if (data != null || data !== undefined) {
      const blocks: Block[] = [];

      while (data!.toString('utf8') !== '') {
        if (data!.toString('utf8') !== '') {
          const lastBlock = data!.slice(
            data!.lastIndexOf(DELIMITER, undefined, 'utf8'),
            data!.byteLength,
          );

          data = data!.slice(
            0,
            data!.lastIndexOf(DELIMITER, undefined, 'utf8'),
          );

          blocks.push(await parseFileData(lastBlock));
        }
      }
      resolve(blocks.reverse());
    } else {
      resolve(null);
    }
  });
};

export const jitcoinFileByNumber = (nmbr: number): string => {
  return (
    BLOCKCHAIN_DIR +
    '/' +
    JITCOIN_FILE.replace('$', appendZeros(nmbr ? nmbr : 0))
  );
};

const lastJitCoinFile = async (): Promise<string> => {
  const files = await readDir(BLOCKCHAIN_DIR);

  if (files.length === 0) {
    const file =
      BLOCKCHAIN_DIR + '/' + JITCOIN_FILE.replace('$', appendZeros(0));
    await write(file, '');
    return file;
  }
  return BLOCKCHAIN_DIR + '/' + files[files.length - 1];
};

export const getFileCount = async (): Promise<number> => {
  if (await jitcoinPathExists()) {
    const files = await readDir(BLOCKCHAIN_DIR);
    return files.length;
  } else {
    return -1;
  }
};

export const checkWallet = async (passphrase: string) => {
  const publicKeyFile = `${WALLET_DIR}/${WALLET_FILE_STARTER}${PUBLIC_KEY_FILE_ENDING}`;
  const privateKeyFile = `${WALLET_DIR}/${WALLET_FILE_STARTER}${PRIVATE_KEY_FILE_ENDING}`;

  if (!(await jitcoinPathExists())) {
    await createDir();
  }

  if (
    !((await fileExists(publicKeyFile)) && (await fileExists(privateKeyFile)))
  ) {
    const keys = await key('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
        cipher: 'aes-256-cbc',
        passphrase,
      },
    });

    console.log('created new private and public key!');

    if(keys !== null){
      await write(publicKeyFile, keys.publicKey);
      await write(privateKeyFile, keys.privateKey);
    }
  }
};

export const signTransaction = async (
  amount: number,
  randomHash: string,
  passphrase: string,
) => {
  const publicKeyFile = `${WALLET_DIR}/${WALLET_FILE_STARTER}${PUBLIC_KEY_FILE_ENDING}`;
  const privateKeyFile = `${WALLET_DIR}/${WALLET_FILE_STARTER}${PRIVATE_KEY_FILE_ENDING}`;

  if ((await fileExists(publicKeyFile)) && (await fileExists(privateKeyFile))) {
    const privateKey = await read(privateKeyFile);
    const keyObject = createPrivateKey({
      key: privateKey,
      passphrase,
    });

    const publicKey = (await read(publicKeyFile)).toString();

    const sign = createSign('RSA-SHA512');
    sign.update(`${amount}${randomHash}${publicKey}`);

    return sign.sign(keyObject, 'hex');
  } else {
    return null;
  }
};

export const getPublicKey = async (): Promise<string> => {
  return (await read(
    `${WALLET_DIR}/${WALLET_FILE_STARTER}${PUBLIC_KEY_FILE_ENDING}`,
  )).toString();
};

export const verifySigniture = (amount: number, randomHash: string, publicKey: string, signature: string) => {
  const keyObject = createPublicKey({
    key: publicKey,
  });

  const verify = createVerify('RSA-SHA512');
  verify.update(`${amount}${randomHash}${publicKey}`);
  return verify.verify(keyObject, signature, 'hex');
};
