import {
  pathExists,
  writeFile,
  stat,
  mkdirp,
  appendFile,
  Stats,
  readdir,
  readFile,
  exists
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
  TRANSACTIONS_PER_BLOCK,
  MINIMUM_REWARD_PERCENTAGE
} from './constants';
import {
  Transaction,
  Block,
  Data,
  CoinbaseTransaction
} from '../jitcoin/block';
import {
  BlockHeader,
  TransactionElement,
  BlockBody,
  CoinbaseTransactionElement
} from './interfaces';
import {
  createHash,
  generateKeyPair,
  createPrivateKey,
  RSAKeyPairOptions,
  createSign,
  createVerify,
  createPublicKey
} from 'crypto';
import { deflate, inflate } from 'zlib';
import { resolve as pathResolve } from 'path';
import { stringify } from 'querystring';

const write = (file: string, data: string | Buffer): Promise<boolean> =>
  new Promise(resolve => {
    writeFile(file, data, err => {
      if (err) {
        return resolve(false);
      }
      resolve(true);
    });
  });

const fileExists = (path: string): Promise<boolean> =>
  new Promise(resolve => {
    exists(path, exists => {
      resolve(exists);
    });
  });

const read = (path: string): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    readFile(path, (err, data) => {
      if (err) {
        return reject(err);
      }
      resolve(data);
    });
  });

const readDir = (path: string): Promise<string[]> =>
  new Promise((resolve, reject) => {
    readdir(path, (err, files) => {
      if (err) {
        return reject(err);
      }
      resolve(files);
    });
  });

const stats = (path: string): Promise<Stats> =>
  new Promise((resolve, reject) => {
    stat(path, (err, stats) => {
      if (err) {
        return reject(err);
      }
      resolve(stats);
    });
  });

const compress = (buffer: Buffer): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    deflate(buffer, (err, result) => {
      if (err) {
        return reject(err);
      }
      resolve(result);
    });
  });
};

const decompress = (buffer: Buffer): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    inflate(buffer, (err, result) => {
      if (err) {
        return reject(err);
      }
      resolve(result);
    });
  });
};

const key = (
  type: 'rsa',
  options: RSAKeyPairOptions<'pem', 'pem'>
): Promise<{ privateKey: string; publicKey: string } | null> => {
  return new Promise((resolve, reject) => {
    generateKeyPair(type, options, (err, publicKey, privateKey) => {
      if (err) {
        return reject(err);
      }
      resolve({ privateKey, publicKey });
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
  gameType: number,
  minedAt: number | undefined
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
            minedAt,
            getBlockHash(data.getData(), nonce),
            gameType
          )
        ),
        'utf8'
      )
    );

    const headerSize = headerCompressed.byteLength;

    const bodyCompressed = await compress(
      Buffer.from(
        JSON.stringify(
          getJSONBody(data.transactions, data.coinbaseTransaction)
        ),
        'utf8'
      )
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
    if (!(await jitcoinPathExists())) {
      return resolve(null);
    }
    const file = await getJitCoinFile();

    const data: Buffer = (await read(file)) as Buffer;

    if (data.toString('utf8') === '') {
      return resolve(null);
    }

    // removing delimiter from data
    const lastBlock = data.slice(
      data.lastIndexOf(DELIMITER, undefined, 'utf8'),
      data.byteLength
    );

    return resolve(await parseFileData(lastBlock));
  });
};

/**
 *
 * @author Eleftherios Pavlidis
 * @param hash
 * @returns {Promise<Block | null>}
 */
export const getBlockByHash = async (hash: string): Promise<Block | null> => {
  if (!(await jitcoinPathExists())) {
    return null;
  }
  const count = await getFileCount();

  for (let i = count - 1; i >= 0; i--) {
    const file = jitcoinFileByNumber(i);
    const blocks = await getFileAsArray(file);

    if (blocks === null) {
      return null;
    }

    for (const block of blocks) {
      if (block.hash === hash) {
        return block;
      }
    }
  }

  return null;
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
      (await decompress(header)).toString('utf8')
    );

    // isolating the body

    const bodyLengthBuffer = data.slice(
      headerEnd,
      data.indexOf('x', headerEnd)
    );
    const bodyLength = +bodyLengthBuffer.toString('utf8');
    const bodyStart = headerEnd + bodyLengthBuffer.byteLength;
    const bodyEnd = bodyStart + bodyLength;
    const body = data.slice(bodyStart, bodyEnd);
    const decompressedBody = JSON.parse(
      (await decompress(body)).toString('utf8')
    ) as BlockBody;

    // creating Block of the data gathered of the file

    let blockData: Data | null = null;

    for (const transactionItem of decompressedBody.transactions) {
      const transaction = new Transaction(
        transactionItem.publicKey,
        transactionItem.randomHash,
        transactionItem.inputAmount,
        transactionItem.outputAmount,
        transactionItem.signature
      );

      if (blockData === null) {
        blockData = new Data(transaction);
        continue;
      }

      blockData.addTransaction(transaction);
    }

    if (blockData !== null) {
      if (decompressedBody.coinbaseTransaction !== null) {
        const randomHashes = [];
        for (const transaction of blockData.transactions) {
          randomHashes.push(transaction.randomHash);
        }
        blockData.coinbaseTransaction = new CoinbaseTransaction(
          decompressedBody.coinbaseTransaction.publicKey,
          randomHashes
        );
        blockData.coinbaseTransaction.signature =
          decompressedBody.coinbaseTransaction.signature;
      }

      // recalculating the hash with the given nonce

      let hash: string | undefined = undefined;

      if (decompressedHeader.nonce !== -1) {
        hash = getBlockHash(
          blockData!.getData(),
          decompressedHeader.nonce as number
        );
      }

      const block = new Block(
        decompressedHeader.previousBlockHash,
        blockData,
        decompressedHeader.gameType,
        decompressedHeader.nonce,
        hash,
        decompressedHeader.time
      );
      resolve(block);
    }
  });
};

/**
 *
 * @author Flo Dörr
 * @returns {Promise<Block | null>}
 */
export const updateLastBlockData = (
  transaction: Transaction
): Promise<boolean> => {
  return new Promise(async resolve => {
    if (!(await jitcoinPathExists())) {
      resolve(false);
    }
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
  });
};

/**
 *
 * @author Flo Dörr
 * @returns {Promise<Block | null>}
 */
export const updateLastBlock = (block: Block): Promise<boolean> => {
  return new Promise(async resolve => {
    if (!(await jitcoinPathExists())) {
      return resolve(false);
    }

    // delete the last block from file
    if (!(await deleteLastBlock())) {
      return resolve(false);
    }

    // saving the block to the disk
    await block.save();
    resolve(true);
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

    if (data.toString('utf8') === '') {
      resolve(false);
    }

    const previousData = data.slice(
      0,
      data.lastIndexOf(DELIMITER, undefined, 'utf8')
    );

    await writeFile(file, previousData);
    resolve(true);
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
  gameType: number
): BlockHeader => {
  const header = {
    version: VERSION,
    previousBlockHash,
    merkleTree,
    nonce,
    time,
    hash,
    gameType
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
  block: Block
): BlockHeader => {
  const header = {
    version: VERSION,
    previousBlockHash: block.previousBlockHash,
    merkleTree: block.merkleTree,
    nonce: block.nonce,
    time: block.minedAt,
    hash: getBlockHash(block.data.getData(), block.nonce),
    gameType: block.gameType
  } as BlockHeader;

  return header;
};

/**
 *
 * @author Flo Dörr
 * @param {BlockHeader} header
 * @returns {JSON} Header Object
 */
export const getJSONBody = (
  transactions: Transaction[],
  coinbaseTransaction?: CoinbaseTransaction | null
): BlockBody => {
  const trans = [];

  for (const transaction of transactions) {
    trans.push({
      inputAmount: transaction.inputAmount,
      outputAmount: transaction.outputAmount,
      randomHash: transaction.randomHash,
      signature: transaction.signature,
      publicKey: transaction.publicKey
    } as TransactionElement);
  }

  let coinbaseTransactionElement = null;

  if (coinbaseTransaction !== null && coinbaseTransaction !== undefined) {
    coinbaseTransactionElement = {
      publicKey: coinbaseTransaction.publicKey,
      signature: coinbaseTransaction.signature,
      winningHash: coinbaseTransaction.winningHash
    } as CoinbaseTransactionElement;
  }

  // write body
  const body = {
    coinbaseTransaction: coinbaseTransactionElement,
    transactions: trans
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
    const file = pathResolve(
      BLOCKCHAIN_DIR,
      JITCOIN_FILE.replace('$', appendZeros(0))
    );
    await write(file, '');
    return file;
  }

  const currentFile = pathResolve(BLOCKCHAIN_DIR, files[files.length - 1]);
  if ((await getFilesize(currentFile)) <= MAX_FILE_SIZE) {
    return currentFile;
  }

  const file = pathResolve(
    BLOCKCHAIN_DIR,
    JITCOIN_FILE.replace('$', appendZeros(getLastFileCount(files) + 1))
  );
  await write(file, '');
  return file;
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
  // tslint:disable-next-line
  return parseInt(
    files[files.length - 1]
      .replace(JITCOIN_FILE_STARTER, '')
      .replace(JITCOIN_FILE_ENDING, ''),
    10
  );
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
  return hash === null || hash.substring(0, DIFFICULTY) === getZeroString();
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
  file: string | null
): Promise<number | null> => {
  return new Promise(async resolve => {
    if (file === null) {
      file = await lastJitCoinFile();
    }

    const data: Buffer = await read(file);

    if (data === undefined) {
      return resolve(null);
    }

    resolve(data.toString().split(DELIMITER).length - 1);
  });
};

/**
 *
 * @author Flo Dörr
 * @returns {Block[] | null} Array of blocks (the block with index 0 is the top one)
 */
export const getFileAsArray = (
  file?: string | null
): Promise<Block[] | null> => {
  return new Promise(async resolve => {
    if (file === null || file === undefined) {
      file = await lastJitCoinFile();
    }

    let data = await read(file);
    if (!data) {
      return resolve(null);
    }

    const blocks: Block[] = [];
    while (data.toString('utf8') !== '') {
      if (data.toString('utf8') !== '') {
        const lastBlock = data!.slice(
          data.lastIndexOf(DELIMITER, undefined, 'utf8'),
          data.byteLength
        );

        data = data.slice(0, data.lastIndexOf(DELIMITER, undefined, 'utf8'));

        blocks.push(await parseFileData(lastBlock));
      }
    }
    resolve(blocks.reverse());
  });
};

export const jitcoinFileByNumber = (nmbr: number): string => {
  return pathResolve(
    BLOCKCHAIN_DIR,
    JITCOIN_FILE.replace('$', appendZeros(nmbr ? nmbr : 0))
  );
};

const lastJitCoinFile = async (): Promise<string> => {
  const files = await readDir(BLOCKCHAIN_DIR);

  if (files.length !== 0) {
    return pathResolve(BLOCKCHAIN_DIR, files[files.length - 1]);
  }

  const file = pathResolve(
    BLOCKCHAIN_DIR,
    JITCOIN_FILE.replace('$', appendZeros(0))
  );
  await write(file, '');
  return file;
};

export const getFileCount = async (): Promise<number> => {
  if (!(await jitcoinPathExists())) {
    return -1;
  }

  const files = await readDir(BLOCKCHAIN_DIR);
  return files.length;
};

export const createWallet = async (passphrase: string): Promise<boolean> => {
  const publicKeyFile = pathResolve(
    WALLET_DIR,
    `${WALLET_FILE_STARTER}${PUBLIC_KEY_FILE_ENDING}`
  );
  const privateKeyFile = pathResolve(
    WALLET_DIR,
    `${WALLET_FILE_STARTER}${PRIVATE_KEY_FILE_ENDING}`
  );

  if (!(await jitcoinPathExists())) {
    await createDir();
  }

  const keys = await key('rsa', {
    modulusLength: 4096,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
      cipher: 'aes-256-cbc',
      passphrase
    }
  });

  console.log('created new private and public key!');

  if (keys !== null) {
    await write(publicKeyFile, keys.publicKey);
    await write(privateKeyFile, keys.privateKey);
    return true;
  } else {
    return false;
  }
};

export const walletExists = async (): Promise<boolean> => {
  const publicKeyFile = pathResolve(
    WALLET_DIR,
    `${WALLET_FILE_STARTER}${PUBLIC_KEY_FILE_ENDING}`
  );
  const privateKeyFile = pathResolve(
    WALLET_DIR,
    `${WALLET_FILE_STARTER}${PRIVATE_KEY_FILE_ENDING}`
  );
  const publicKeyExists = await fileExists(publicKeyFile);
  const privateKeyExists = await fileExists(privateKeyFile);
  return publicKeyExists || privateKeyExists;
};

export const checkPassphrase = async (passphrase: string): Promise<boolean> => {
  const privateKeyFile = pathResolve(
    WALLET_DIR,
    `${WALLET_FILE_STARTER}${PRIVATE_KEY_FILE_ENDING}`
  );
  const privateKey = await read(privateKeyFile);
  try {
    createPrivateKey({
      key: privateKey,
      passphrase
    });
    return true;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('EVP_DecryptFinal_ex')) {
        return false;
      }
      throw error;
    }
  }
  return false;
};

export const signTransaction = async (
  inputAmount: number,
  outputAmount: number,
  randomHash: string,
  passphrase: string
) => {
  const publicKeyFile = pathResolve(
    WALLET_DIR,
    `${WALLET_FILE_STARTER}${PUBLIC_KEY_FILE_ENDING}`
  );
  const privateKeyFile = pathResolve(
    WALLET_DIR,
    `${WALLET_FILE_STARTER}${PRIVATE_KEY_FILE_ENDING}`
  );

  if (
    !(await fileExists(publicKeyFile)) ||
    !(await fileExists(privateKeyFile))
  ) {
    return null;
  }

  const privateKey = await read(privateKeyFile);
  const keyObject = createPrivateKey({
    key: privateKey,
    passphrase
  });

  const publicKey = (await read(publicKeyFile)).toString();

  const sign = createSign('RSA-SHA512');
  sign.update(`${inputAmount}${outputAmount}${randomHash}${publicKey}`);

  return sign.sign(keyObject, 'hex');
};

export const signCoinbaseTransaction = async (
  winningHash: string,
  transactionSignatures: string[],
  passphrase: string
) => {
  const publicKeyFile = pathResolve(
    WALLET_DIR,
    `${WALLET_FILE_STARTER}${PUBLIC_KEY_FILE_ENDING}`
  );
  const privateKeyFile = pathResolve(
    WALLET_DIR,
    `${WALLET_FILE_STARTER}${PRIVATE_KEY_FILE_ENDING}`
  );

  if (
    !(await fileExists(publicKeyFile)) ||
    !(await fileExists(privateKeyFile))
  ) {
    return null;
  }

  const privateKey = await read(privateKeyFile);
  const keyObject = createPrivateKey({
    key: privateKey,
    passphrase
  });

  const publicKey = (await read(publicKeyFile)).toString();

  const sign = createSign('RSA-SHA512');
  sign.update(`${winningHash}${stringify(transactionSignatures)}${publicKey}`);

  return sign.sign(keyObject, 'hex');
};

export const getPublicKey = async () => {
  return read(
    pathResolve(WALLET_DIR, `${WALLET_FILE_STARTER}${PUBLIC_KEY_FILE_ENDING}`)
  );
};

export const verifySignature = (
  inputAmount: number,
  outputAmount: number,
  randomHash: string,
  publicKey: string,
  signature: string
) => {
  const keyObject = createPublicKey({
    key: `${publicKey}`
  });

  const verify = createVerify('RSA-SHA512');
  verify.update(`${inputAmount}${outputAmount}${randomHash}${publicKey}`);
  return verify.verify(keyObject, signature, 'hex');
};

export const verifyBlock = (block: Block): Array<number | boolean> => {
  const response = [];
  response.push(block.data.transactions.length === TRANSACTIONS_PER_BLOCK);
  if (
    getBlockHash(block.data.getData(), block.nonce).substring(0, DIFFICULTY) !==
    getZeroString()
  ) {
    response.push(true);
    const transactions = block.data.transactions;
    const publicKeys = [];
    response.push(-1);
    for (let i = 0; i < transactions.length; i++) {
      publicKeys.push(transactions[i].publicKey);
      if (!transactions[i].verify()) {
        response.pop();
        response.push(i);
        return response;
      }
    }
    response.push(hasDuplicates(publicKeys));
  } else {
    response.push(false);
  }
  return response;
};

export const verifyReward = (block: Block): number[] => {
  const response = [];
  let reward = 0.0;
  const transactions = block.data.transactions;
  for (let i = 0; i < transactions.length; i++) {
    const transaction = transactions[i];
    if (transaction.inputAmount - transaction.outputAmount < 0) {
      response.push(0);
      response.push(i);
    } else if (transaction.outputAmount > transaction.inputAmount) {
      response.push(-1);
      response.push(i);
    } else if (
      transaction.inputAmount - transaction.outputAmount <=
      transaction.inputAmount * MINIMUM_REWARD_PERCENTAGE
    ) {
      response.push(-2);
      response.push(i);
    } else {
      reward += transaction.inputAmount - transaction.outputAmount;
    }
  }
  response.push(-3);
  response.push(reward);
  return response;
};

const getReward = (transactions: Transaction[]): number => {
  let reward = 0.0;
  for (let i = 0; i < transactions.length; i++) {
    const transaction = transactions[i];
    reward += transaction.inputAmount - transaction.outputAmount;
  }
  return reward;
};

const hasDuplicates = (array: string[]) => {
  return new Set(array).size !== array.length;
};

export const getRandomHashesFromData = (data: Data): string[] => {
  const randomHashes = [];
  for (const transaction of data.transactions) {
    randomHashes.push(transaction.randomHash);
  }
  return randomHashes;
};

export const getTransactionSignaturesFromData = (data: Data): string[] => {
  const transactionSignatures = [];
  for (const transaction of data.transactions) {
    transactionSignatures.push(transaction.signature!);
  }
  return transactionSignatures;
};

export const getBalance = async (): Promise<number> => {
  if (await jitcoinPathExists()) {
    let balance = 0.0;
    let count = await getFileCount();
    const publicKey = (await getPublicKey()).toString('utf8');
    while (count > 0) {
      count--;
      const blocks = await getFileAsArray(jitcoinFileByNumber(count));
      if (blocks !== undefined && blocks !== null) {
        for (const block of blocks) {
          const coinbaseTransaction = block.data.coinbaseTransaction;
          if (
            coinbaseTransaction !== null &&
            coinbaseTransaction !== undefined
          ) {
            if (coinbaseTransaction.publicKey === publicKey) {
              balance += getReward(block.data.transactions);
            }
          }
        }
      } else {
        return -1;
      }
    }
    return balance;
  } else {
    return -1;
  }
};

/*const getCurrentBalance = async (): Promise<number> => {
  const balance = 0;
  let count = await getFileCount();
  while(count !== 0){
    const file = JITCOIN_FILE_STARTER + appendZeros(count) + JITCOIN_FILE_ENDING;
    const blockArray = await getFileAsArray(file);
    if(blockArray !== null){
      for(let i = 0; i < blockArray.length; i++){
        const block = blockArray[i];
        if(block.data.transactions.){

        }
      }
    }
    count--;
  }
}*/
