import { Blockchain } from './jitcoin/blockchain';
import { Block, Data, Transaction } from './jitcoin/block';
import { createHash } from 'crypto';
import { prompt } from 'inquirer';
import { getBlockHash, getLastBlock } from './misc/helper';

let beforeExecution;

let elapsedTime;

let blockchain: Blockchain;

(async () => {
  const results: any = await prompt([
    {
      type: 'input',
      name: 'iterations',
      message: 'How many blocks should be in the blockchain?',
      default: 10,
    },
    {
      type: 'input',
      name: 'zeros',
      message: 'How many zeros are required to mine a hash?',
      default: 4,
    },
  ]);
  // testing the blockchain functionallity: Increasing the amount of starting zeros leads to a massive increase of mining time
  await randomBlockChain(results.iterations as number, results.zeros as number);
})();

function getRandomHash(): string {
  const currentDate = new Date().valueOf().toString();
  const random = Math.random().toString();
  return createHash('sha512')
    .update(currentDate + random)
    .digest('hex');
}

async function randomBlockChain(blockCount: number, zeroCount: number) {
  const lastBlock = await getLastBlock();
  if (lastBlock !== null) {
    // just for Bruno
    console.log(
      `Found saved blockchain! Appending to existing block whose hash is ${
        lastBlock.hash
      }`,
    );
    blockchain = new Blockchain(lastBlock);
    followingBlocks(blockCount, zeroCount);
  } else {
    beforeExecution = Date.now();

    const data = getRandomData();

    const firstBlock = new Block(null, data, null, null, zeroCount);

    await firstBlock.mine();

    elapsedTime = Date.now() - beforeExecution;

    console.log(
      'mining took ' +
        elapsedTime / 1000 +
        ' seconds (' +
        (elapsedTime / 1000 / 60).toFixed(2) +
        ' minutes)',
    );

    console.log(
      'My hash is: ' +
        getBlockHash(firstBlock.data.getData(), firstBlock.nonce) +
        '\nI am the first block!',
    );

    console.log(
      '____________________________________________________________________________________________________________________________________________',
    );

    blockchain = new Blockchain(firstBlock);

    followingBlocks(blockCount - 1, zeroCount);
  }

  /*beforeExecution = Date.now();

  const firstBlockOld = new Block(null, data, zeroCount);

  firstBlockOld.mineOld();

  elapsedTime = Date.now() - beforeExecution;

  console.log(
    'mining took ' +
      elapsedTime / 1000 +
      ' seconds (' +
      (elapsedTime / 1000 / 60).toFixed(2) +
      ' minutes)',
  );

  console.log(
    'My hash is: ' + firstBlockOld.getBlockHash() + '\nI am the first block!',
  );

  console.log(
    '____________________________________________________________________________________________________________________________________________',
  );*/
}

async function followingBlocks(blockCount: number, zeroCount: number) {
  for (let i = 0; i < blockCount; i++) {
    beforeExecution = Date.now();

    const block = new Block(
      getBlockHash(
        blockchain.blocks[blockchain.blocks.length - 1].data.getData(),
        blockchain.blocks[blockchain.blocks.length - 1].nonce,
      ),
      getRandomData(),
      null,
      null,
      zeroCount,
    );

    await block.mine();

    blockchain.addBlock(block);

    elapsedTime = Date.now() - beforeExecution;

    console.log(
      'mining took ' +
        elapsedTime / 1000 +
        ' seconds (' +
        (elapsedTime / 1000 / 60).toFixed(2) +
        ' minutes)',
    );

    /*console.log(
      'My hash is: ' +
        getBlockHash(block.data.getData(), block.nonce) +
        '\nI am the ' +
        (i + 2) +
        '. block! The previous hash was: ' +
        getBlockHash(
          blockchain.blocks[blockchain.blocks.length - 2].data.getData(),
          blockchain.blocks[blockchain.blocks.length - 2].nonce,
        ),
    );*/

    console.log(
      'My hash is: ' +
        getBlockHash(block.data.getData(), block.nonce) +
        '\nI am the ' +
        (i + 2) +
        '. block! The previous hash was: ' +
        blockchain.blocks[blockchain.blocks.length - 1].previousBlockHash,
    );

    console.log(
      '____________________________________________________________________________________________________________________________________________',
    );
  }
}

function getRandomData(): Data {
  const transaction = getRandomTransaction();
  const data = new Data(transaction);
  for (let i = 0; i < 9; i++) {
    data.addTransaction(getRandomTransaction());
  }
  return data;
}

function getRandomTransaction(): Transaction {
  return new Transaction(
    getRandomHash(),
    getRandomHash(),
    Math.round(Math.random() * (40 - 1) + 1),
  );
}
