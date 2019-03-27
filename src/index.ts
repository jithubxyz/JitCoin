import * as express from 'express';
import {
  PORT,
  TRANSACTIONS_PER_BLOCK,
  RESPONSE_CODES,
  DIFFICULTY,
  BLOCKCHAIN_DIR,
  JITCOIN_FILE,
} from './misc/constants';
import {
  getRandomHash,
  getLastBlock,
  updateLastBlockData,
  getJSONBody,
  getBlockHash,
  getZeroString,
  getJSONHeaderFromBlock,
  isHashMined,
  updateLastBlock,
  deleteLastBlock,
  lengthLastBlockFile,
  jitcoinFileByNumber,
  getFileAsArray,
  getJitCoinFile,
} from './misc/helper';
import { Transaction, Data, Block } from './jitcoin/block';
import { BlockResponse } from './misc/interfaces';
const app = express();

app.get('/mine', express.json(), async (req, res) => {
  const block = await getLastBlock();
  if (block !== null) {
    if (block.data.transactions.length === TRANSACTIONS_PER_BLOCK) {
      if (
        getBlockHash(block.data.getData(), block.nonce).substring(
          0,
          DIFFICULTY,
        ) !== getZeroString()
      ) {
        await deleteLastBlock();
        await block.mine();
        const header = getJSONHeaderFromBlock(block);
        const body = getJSONBody(block.data.transactions);
        res.json({
          message: 'Block was mined successfully!⛏️',
          code: RESPONSE_CODES.PASS,
          data: [header, body],
        } as BlockResponse);
      } else {
        res.json({
          message: 'This Block was already mined!😞',
          code: RESPONSE_CODES.ALREADY_MINED,
        } as BlockResponse);
      }
    }
  } else {
    res.json({
      message: 'There is no Block saved on your disk!😞',
      code: RESPONSE_CODES.NO_BLOCK_ON_DISK,
    } as BlockResponse);
  }
});

app.post('/addTransaction', express.json(), async (req, res) => {
  const body = req.body;
  const amount: number | undefined = body.amount;
  if (amount !== undefined) {
    const randomHash: string = getRandomHash();
    let userId: string | undefined = body.userId;

    if (userId === undefined) {
      userId = getRandomHash();
    }
    const block = await getLastBlock();
    if (block !== null) {
      if (
        block.hash === '' &&
        block.data.transactions.length < TRANSACTIONS_PER_BLOCK
      ) {
        const transaction = new Transaction(userId, randomHash, amount);
        if (await updateLastBlockData(transaction)) {
          const block = (await getLastBlock())!!;
          const header = getJSONHeaderFromBlock(block);
          const body = getJSONBody(block.data.transactions);
          res.json({
            message: 'Transaction was added successfully!😁',
            code: RESPONSE_CODES.PASS,
            data: [header, body],
          } as BlockResponse);
        } else {
          res.json({
            message: 'An error ocurred!😞',
            code: RESPONSE_CODES.ERROR,
          } as BlockResponse);
        }
      } else {
        if (
          block.hash === '' &&
          block.data.transactions.length === TRANSACTIONS_PER_BLOCK
        ) {
          res.json({
            message:
              'The last block is already full and has to be mined first!😞',
            code: RESPONSE_CODES.MINE_BLOCK,
          } as BlockResponse);
        } else if (
          block.hash !== '' &&
          block.data.transactions.length === TRANSACTIONS_PER_BLOCK
        ) {
          res.json({
            message:
              'The last block was already mined but no new block was created yet!😞',
            code: RESPONSE_CODES.NEW_BLOCK,
          } as BlockResponse);
        }
      }
    } else {
      res.json({
        message: 'No Jitcoin file found!😠',
        code: RESPONSE_CODES.NO_BLOCK_ON_DISK,
      } as BlockResponse);
    }
  } else {
    res.json({
      message: 'No amount parameter was provided!😞',
      code: RESPONSE_CODES.NO_AMOUNT_PROVIDED,
    } as BlockResponse);
  }
});

app.get('/lastBlock', express.json(), async (req, res) => {
  const block = await getLastBlock();
  if (block !== null) {
    const header = getJSONHeaderFromBlock(block);
    const body = getJSONBody(block.data.transactions);
    res.json({
      message: 'Here is the last block!👍',
      code: RESPONSE_CODES.PASS,
      data: [header, body],
    } as BlockResponse);
  } else {
    res.json({
      message: 'No Jitcoin file found!😠',
      code: RESPONSE_CODES.NO_BLOCK_ON_DISK,
    } as BlockResponse);
  }
});

app.post('/newBlock', express.json(), async (req, res) => {
  const lastBlock = await getLastBlock();
  const body = req.body;
  const userId = body.userId;
  const amount: number | undefined = body.amount;
  if (amount !== undefined) {
    let previousHash: string | null = null;
    if (lastBlock !== null) {
      previousHash = getBlockHash(lastBlock.data.getData(), lastBlock.nonce);
    }
    if (isHashMined(previousHash)) {
      const transaction = new Transaction(
        userId ? userId : getRandomHash(),
        getRandomHash(),
        amount,
      );
      const data = new Data(transaction);
      const block = new Block(previousHash, data);
      await block.save();
      const header = getJSONHeaderFromBlock(block);
      const body = getJSONBody(block.data.transactions);
      res.json({
        message: 'The new Block was created successfully!😠',
        code: RESPONSE_CODES.PASS,
        data: [header, body],
      } as BlockResponse);
    } else {
      res.json({
        message: 'The previous block was not mined!😠',
        code: RESPONSE_CODES.NOT_YET_MINED,
      } as BlockResponse);
    }
  } else {
    res.json({
      message: 'No amount parameter was provided!😞',
      code: RESPONSE_CODES.NO_AMOUNT_PROVIDED,
    } as BlockResponse);
  }
});

app.get('/deleteLastBlock', express.json(), async (req, res) => {
  if (await deleteLastBlock()) {
    res.json({
      message: 'The Block was deleted!',
      code: RESPONSE_CODES.PASS,
    } as BlockResponse);
  } else {
    res.json({
      message: 'The Block could not be deleted!😞',
      code: RESPONSE_CODES.ERROR,
    } as BlockResponse);
  }
});

app.post('/length', express.json(), async (req, res) => {
  const body = req.body;
  const fileNumber = body.file as number;
  let file = null;
  if (fileNumber !== null && fileNumber !== undefined) {
    file = jitcoinFileByNumber(fileNumber);
  }
  const count = await lengthLastBlockFile(file);
  if (count !== null) {
    res.json({
      message: 'Length found!',
      code: RESPONSE_CODES.PASS,
      data: count,
    } as BlockResponse);
  } else {
    res.json({
      message: 'No length found!😞',
      code: RESPONSE_CODES.ERROR,
    } as BlockResponse);
  }
});

app.post('/fileAsArray', express.json(), async (req, res) => {
  const body = req.body;
  const fileNumber = body.file as number;
  let file = null;
  if (fileNumber !== null || fileNumber !== undefined) {
    file = jitcoinFileByNumber(fileNumber);
  }
  const blocks = await getFileAsArray(file);
  if (blocks !== null) {
    const response = [];
    for (const block of blocks) {
      response.push([
        await getJSONHeaderFromBlock(block),
        await getJSONBody(block.data.transactions),
      ]);
    }
    res.json({
      message: 'Blocks found!',
      code: RESPONSE_CODES.PASS,
      data: response,
    } as BlockResponse);
  } else {
    res.json({
      message: 'No Blocks found!😞',
      code: RESPONSE_CODES.ERROR,
    } as BlockResponse);
  }
});

app.listen(PORT, () => {
  console.log(`server is up and running! We are listening on ${PORT}`);
});
