import { stringify } from 'querystring';
import {
  saveBinaryHex,
  getBlockHash,
  isHashMined,
  signTransaction,
  verifySignature,
  signCoinbaseTransaction,
  getPublicKey
} from '../misc/helper';
import { fork, ChildProcess } from 'child_process';
import { cpus } from 'os';
import { stdout as log } from 'single-line-log';
import { join } from 'path';

/**
 *
 * @author Eleftherios Pavlidis, Flo Dörr
 * @date 2019-01-31
 * @export
 * @class Block
 */
export class Block {
  previousBlockHash: string | null;
  data: Data;
  merkleTree: string;
  hash: string;
  nonce: number;
  gameType: number;

  /**
   * Creates an instance of Block.
   *
   * @date 2019-01-31
   * @param {(string | null)} previousBlockHash
   * @param {Data} data
   * @memberof Block
   */
  constructor(
    previousBlockHash: string | null,
    data: Data,
    gameType: number,
    nonce?: number | undefined,
    hash?: string | undefined,
  ) {
    this.previousBlockHash = previousBlockHash;
    this.data = data;
    this.hash = hash ? hash : '';
    this.nonce = nonce ? nonce : -1;
    this.merkleTree = data.getMerkleTree();
    this.gameType = gameType;
  }

  /**
   * mines the nonce
   *
   * @date 2019-01-31
   * @memberof Block
   */
  async mine() {
    return new Promise(resolve => {
      const threads = cpus().length;
      const workers: ChildProcess[] = [];
      for (let i = 0; i < threads; i++) {
        const thread = fork(join(__dirname, 'mine.js'));
        workers.push(thread);
        thread.send({
          startingNonce: i,
          data: this.data.getData(),
          steps: threads
        });
        thread.on('message', async ({ nonce, hash }) => {
          for (const worker of workers) {
            if (worker !== undefined) {
              worker.kill();
            }
          }
          this.nonce = nonce;
          this.hash = hash;
          await this.save();
          resolve(this.hash);
        });
      }
    });
  }

  mineOld() {
    while (!isHashMined(this.hash)) {
      // incrementing the nonce | init value is -1
      this.nonce++;
      // data of the block is being hashed with the nonce
      this.hash = getBlockHash(this.data.getData(), this.nonce);
      // just some ouptut...
      if (this.nonce % 10000 === 0) {
        log(this.nonce + '. hash: ' + this.hash);
      }
    }
    console.log("\nnonce found! it's " + this.nonce);
  }

  /**
   * saves the block to the disk
   *
   * @memberof Block
   */
  save() {
    return saveBinaryHex(
      this.previousBlockHash,
      this.merkleTree,
      this.nonce,
      this.data,
      this.gameType
    );
  }
}

/**
 *
 * @author Eleftherios Pavlidis, Flo Dörr
 * @date 2019-01-31
 * @export
 * @class Data
 */
export class Data {

  coinbaseTransaction: CoinbaseTransaction | null;
  transactions: Transaction[];

  /**
   * Creates an instance of Data.
   * @date 2019-01-31
   * @param {Transaction} transaction
   * @memberof Data
   */
  constructor(transaction: Transaction) {
    this.transactions = [transaction];
    this.coinbaseTransaction = null;
  }

  /**
   *
   * @date 2019-01-31
   * @param {Transaction} transaction
   * @memberof Data
   */
  addTransaction(transaction: Transaction) {
    this.transactions.push(transaction);
  }

  /**
   *
   * @date 2019-01-31
   * @returns {string} merkle tree
   * @memberof Data
   */
  getMerkleTree(): string {
    let childs = [];
    for (let i = 0; i < this.transactions.length; i++) {
      childs.push(getBlockHash(this.transactions[i].toString()));
    }
    while (true) {
      const newChild = [];
      if (childs.length === 1) {
        break;
      }
      if (childs.length % 2 === 0) {
        for (let i = 0; i < childs.length / 2; i++) {
          newChild.push(getBlockHash(childs[i * 2] + childs[i * 2 + 1]));
        }
        childs = newChild;
        continue;
      }

      for (let i = 0; i < Math.floor(childs.length / 2); i++) {
        newChild.push(getBlockHash(childs[i * 2] + childs[i * 2 + 1]));
      }

      newChild.push(getBlockHash(childs[childs.length - 1]));
      childs = newChild;
    }
    return childs[0];
  }

  /**
   *
   * @date 2019-01-31
   * @returns {[string]} data concated in a string
   * @memberof Data
   */
  getData(): string {
    const data = [];
    for (let i = 0; i < this.transactions.length; i++) {
      data.push(this.transactions[i].getData());
    }
    return stringify(data);
  }

  async createCoinbaseTransaction() {
    const randomHashes = [];
    for (const transaction of this.transactions) {
      randomHashes.push(transaction.randomHash);
    }
    this.coinbaseTransaction = new CoinbaseTransaction((await getPublicKey()).toString('utf8'), randomHashes);
  }

  async signCoinbaseTransaction(passphrase: string): Promise<boolean> {
    if (this.coinbaseTransaction !== null && this.coinbaseTransaction !== undefined) {
      const transactionSignatures = [];
      for (const transaction of this.transactions) {
        if (transaction.signature !== null && transaction.signature !== undefined) {
          transactionSignatures.push(transaction.signature);
        } else {
          return false;
        }
      }
      await this.coinbaseTransaction.sign(transactionSignatures, passphrase);
      return true;
    } else {
      return false;
    }
  }
}

/**
 *
 * @author Eleftherios Pavlidis, Flo Dörr
 * @date 2019-01-31
 * @export
 * @class Transaction
 */
export class Transaction {

  signature: string | null = null;
  publicKeyHash: string;
  publicKey: string;
  randomHash: string;
  inputAmount: number;
  outputAmount: number;

  /**
   * Creates an instance of Transaction.
   * @date 2019-01-31
   * @param {string} publicKey the public key of the issuer
   * @param {string} randomHash the randomly by every user generate user
   * @param {number} amount the amount of JitCoins to be betted
   * @memberof Transaction
   */
  constructor(
    publicKey: string,
    randomHash: string,
    inputAmount: number,
    outputAmount: number,
    signature?: string | undefined
  ) {
    this.publicKeyHash = getBlockHash(publicKey);
    this.publicKey = publicKey;
    this.randomHash = randomHash;
    this.inputAmount = inputAmount;
    this.outputAmount = outputAmount;
    this.signature = signature ? signature : null;
  }

  /**
   *
   * @date 2019-01-31
   * @returns {string} returns stringified data
   * @memberof Transaction
   */
  getData(): string {
    return stringify(this);
  }

  /**
   *
   * @date 2019-01-31
   * @memberof Transaction
   */
  async sign(passphrase: string) {
    this.signature = await signTransaction(
      this.inputAmount,
      this.outputAmount,
      this.randomHash,
      passphrase
    );
  }

  /**
   *
   * @date 2019-01-31
   * @memberof Transaction
   */
  verify(): boolean {
    return this.signature === null
      ? false
      : verifySignature(
        this.inputAmount,
        this.outputAmount,
        this.randomHash,
        this.publicKey,
        this.signature
      );
  }
}

export class CoinbaseTransaction {

  publicKey: string;
  winningHash: string;
  signature: string | null;

  constructor(publicKey: string, randomHashes: string[]) {
    this.publicKey = publicKey;
    this.winningHash = getBlockHash(stringify(randomHashes));
    this.signature = null;
  }

  async sign(transactionSignatures: string[], passphrase: string) {
    this.signature = await signCoinbaseTransaction(this.winningHash, transactionSignatures, passphrase);
  }
}