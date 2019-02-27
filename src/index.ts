import * as express from 'express';
import {
  PORT,
  TRANSACTIONS_PER_BLOCK,
  RESPONSE_CODES,
  DIFFICULTY,
} from './misc/constants';
import {
  getRandomHash,
  getLastBlock,
  updateLastBlockData,
  getJSONBody,
  getBlockHash,
  getZeroString,
  getJSONHeaderFromBlock,
} from './misc/helper';
import { Transaction } from './jitcoin/block';
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
        await block.mine();
        const header = getJSONHeaderFromBlock(block, null);
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
          data: null,
        } as BlockResponse);
      }
    }
  } else {
    res.json({
      message: 'There is no Block saved on your disk!😞',
      code: RESPONSE_CODES.NO_BLOCK_ON_DISK,
      data: null,
    } as BlockResponse);
  }
});

app.post('/addTransaction', express.json(), async (req, res) => {
  const body = req.body;
  const amount: number = body.amount;
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
        const header = getJSONHeaderFromBlock(block, null);
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
          data: null,
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
          data: null,
        } as BlockResponse);
      } else if (
        block.hash !== '' &&
        block.data.transactions.length === TRANSACTIONS_PER_BLOCK
      ) {
        res.json({
          message:
            'The last block was already mined but no new block was created yet!😞',
          code: RESPONSE_CODES.NEW_BLOCK,
          data: null,
        } as BlockResponse);
      }
    }
  } else {
    res.json({
      message: 'No Jitcoin file found!😠',
      code: RESPONSE_CODES.NO_BLOCK_ON_DISK,
      data: null,
    } as BlockResponse);
  }
});

app.get('/lastBlock', express.json(), async (req, res) => {
  const block = await getLastBlock();
  if (block !== null) {
    const header = getJSONHeaderFromBlock(block, null);
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
      data: null,
    } as BlockResponse);
  }
});

app.listen(PORT, () => {
  console.log(`server is up and running! We are listening on ${PORT}`);
});
