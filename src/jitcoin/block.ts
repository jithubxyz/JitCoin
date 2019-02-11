import { stringify } from 'querystring';
import { saveBinaryHex, getBlockHash } from '../misc/helper';
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

  // Debug
  zeroCount: number;

  /**
   * Creates an instance of Block.
   *
   * @date 2019-01-31
   * @param {(string | null)} previousBlockHash
   * @param {Data} data
   * @memberof Block
   */
  constructor(previousBlockHash: string | null, data: Data, zeroCount: number) {
    // Debug
    this.zeroCount = zeroCount;

    this.previousBlockHash = previousBlockHash;
    this.data = data;
    this.hash = '';
    this.nonce = -1;
    this.merkleTree = data.getMerkleTree();
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
      console.log(`trying to find nonce... with ${threads} workers...`);
      const workers: ChildProcess[] = [];
      for (let i = 0; i < threads; i++) {
        const thread = fork(join(__dirname, 'mine.js'));
        workers.push(thread);
        thread.send({
          startingNonce: i,
          data: this.data.getData(),
          steps: threads,
          zeroCount: this.zeroCount,
        });
        thread.on('message', ({ nonce, hash }) => {
          for (const worker of workers) {
            if (worker !== undefined) {
              worker.kill();
            }
          }
          this.nonce = nonce;
          this.hash = hash;
          this.save();
          resolve(this.hash);
        });
        console.log(`added thread nr. ${i}`);
      }
    });
  }

  mineOld() {
    while (this.hash.substring(0, this.zeroCount) !== this.getZeroString()) {
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

  getZeroString(): string {
    return ''.padEnd(this.zeroCount, '0');
  }

  /**
   * saves the block to the disk
   *
   * @memberof Block
   */
  save() {
    saveBinaryHex(
      this.previousBlockHash!!,
      this.merkleTree,
      this.nonce,
      this.data.transactions,
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
  transactions: Transaction[];

  /**
   * Creates an instance of Data.
   * @date 2019-01-31
   * @param {Transaction} transaction
   * @memberof Data
   */
  constructor(transaction: Transaction) {
    this.transactions = [transaction];
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
      } else {
        for (let i = 0; i < Math.floor(childs.length / 2); i++) {
          newChild.push(getBlockHash(childs[i * 2] + childs[i * 2 + 1]));
        }
        newChild.push(getBlockHash(childs[childs.length - 1]));
      }
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
}

/**
 *
 * @author Eleftherios Pavlidis, Flo Dörr
 * @date 2019-01-31
 * @export
 * @class Transaction
 */
export class Transaction {
  userId: string;
  randomHash: string;
  amount: number;

  /**
   * Creates an instance of Transaction.
   * @date 2019-01-31
   * @param {string} userId the id of the user issuing the transaction
   * @param {string} randomHash the randomly by every user generate user
   * @param {number} amount the amount of JitCoins to be betted
   * @memberof Transaction
   */
  constructor(userId: string, randomHash: string, amount: number) {
    this.userId = userId;
    this.randomHash = randomHash;
    this.amount = amount;
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
}
