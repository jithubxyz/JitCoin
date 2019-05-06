import * as express from 'express';
import {
  PORT,
  TRANSACTIONS_PER_BLOCK,
  RESPONSE_CODES,
  PLACE_BET,
  MINE,
  LAST_BLOCK,
  FILE_COUNT,
  FILE_AS_ARRAY,
  LENGTH,
  DELETE_LAST_BLOCK,
  CREATE_WALLET,
  UNLOCK_WALLET,
  GET_BLOCK_BY_HASH,
  GAME_TYPES,
  GET_BALANCE
} from './misc/constants';
import {
  getRandomHash,
  getLastBlock,
  updateLastBlockData,
  getJSONBody,
  getJSONHeaderFromBlock,
  deleteLastBlock,
  lengthLastBlockFile,
  jitcoinFileByNumber,
  getFileAsArray,
  getFileCount,
  getPublicKey,
  verifyBlock,
  walletExists,
  createWallet,
  checkPassphrase,
  verifyReward,
  getBlockByHash,
  getRandomHashesFromData,
  getBalance
} from './misc/helper';
import { Transaction, Data, Block, CoinbaseTransaction } from './jitcoin/block';
import { BlockResponse } from './misc/interfaces';

let passphrase: string;

const app = express();

app.get(MINE, express.json(), async (_, res) => {
  if (!passphrase) {
    return sendResponse(
      res,
      'No passphrase found. Try to /unlockWallet first!😞',
      RESPONSE_CODES.NO_PASSPHRASE
    );
  }

  const block = await getLastBlock();
  if (block === null) {
    return sendResponse(
      res,
      'There is no Block saved on your disk!😞',
      RESPONSE_CODES.NO_BLOCK_ON_DISK
    );
  }

  const valid = verifyBlock(block);
  if (valid[0] !== true) {
    return sendResponse(
      res,
      'This Block is not full!😞',
      RESPONSE_CODES.NOT_FULL
    );
  }

  if (valid[1] !== true) {
    return sendResponse(
      res,
      'This Block was already mined!😞',
      RESPONSE_CODES.ALREADY_MINED
    );
  }

  if (valid[2] !== -1) {
    return sendResponse(
      res,
      `The signature of Block number ${valid[2]} is invalid!😞`,
      RESPONSE_CODES.INVALID_SIGNATURE
    );
  }

  const reward = verifyReward(block);
  if (reward.length !== 2) {
    return sendResponse(
      res,
      `The input/output values are wrong in the following block: ${reward}!😞`,
      RESPONSE_CODES.INVALID_SIGNATURE
    );
  }

  const coinbaseTransaction = new CoinbaseTransaction(
    (await getPublicKey()).toString('utf8'),
    getRandomHashesFromData(block.data)
  );

  block.data.coinbaseTransaction = coinbaseTransaction;

  await block.data.signCoinbaseTransaction(passphrase);
  await block.mine();

  const header = getJSONHeaderFromBlock(block);
  const body = getJSONBody(
    block.data.transactions,
    block.data.coinbaseTransaction
  );

  sendResponse(
    res,
    `Block was mined successfully! You gained a reward of ${
      reward[1]
    } JitCoins!⛏️`,
    RESPONSE_CODES.PASS,
    [header, body]
  );
});

app.post(PLACE_BET, express.json(), async (req, res) => {
  const {
    inputAmount,
    outputAmount
  }: {
    inputAmount: number | undefined;
    outputAmount: number | undefined;
  } = req.body;

  if (passphrase === undefined) {
    sendResponse(
      res,
      'No passphrase found. Try to /unlockWallet first!😞',
      RESPONSE_CODES.NO_PASSPHRASE
    );
    return;
  }

  if (inputAmount === undefined || outputAmount === undefined) {
    sendResponse(
      res,
      'No inputAmount or outputAmount parameter was provided!😞',
      RESPONSE_CODES.NO_AMOUNT_PROVIDED
    );
    return;
  }

  const randomHash: string = getRandomHash();
  const block = await getLastBlock();
  if (block === null) {
    const transaction = new Transaction(
      (await getPublicKey()).toString(),
      getRandomHash(),
      inputAmount,
      outputAmount
    );

    await transaction.sign(passphrase);

    const data = new Data(transaction);
    const block = new Block(null, data, GAME_TYPES.COIN_FLIP);
    await block.save();

    const header = getJSONHeaderFromBlock(block);
    const body = getJSONBody(
      block.data.transactions,
      block.data.coinbaseTransaction
    );

    return sendResponse(
      res,
      'The new Block was created successfully!👍',
      RESPONSE_CODES.PASS,
      [header, body]
    );
  }

  if (
    block.hash === '' &&
    block.data.transactions.length < TRANSACTIONS_PER_BLOCK
  ) {
    const transaction = new Transaction(
      (await getPublicKey()).toString(),
      randomHash,
      inputAmount,
      outputAmount
    );

    await transaction.sign(passphrase);

    if (!(await updateLastBlockData(transaction))) {
      return sendResponse(res, 'An error ocurred!😞', RESPONSE_CODES.ERROR);
    }
    const block = (await getLastBlock())!;

    const header = getJSONHeaderFromBlock(block);
    const body = getJSONBody(
      block.data.transactions,
      block.data.coinbaseTransaction
    );

    return sendResponse(
      res,
      'Transaction was added successfully!😁',
      RESPONSE_CODES.PASS,
      [header, body]
    );
  }

  if (
    block.hash === '' &&
    block.data.transactions.length >= TRANSACTIONS_PER_BLOCK
  ) {
    return sendResponse(
      res,
      'The last block is already full and has to be mined first!😞',
      RESPONSE_CODES.MINE_BLOCK
    );
  }

  const transaction = new Transaction(
    (await getPublicKey()).toString(),
    getRandomHash(),
    inputAmount,
    outputAmount
  );
  await transaction.sign(passphrase);

  const data = new Data(transaction);
  const newBlock = new Block(block.hash, data, GAME_TYPES.COIN_FLIP);
  await newBlock.save();

  const header = getJSONHeaderFromBlock(newBlock);
  const body = getJSONBody(
    newBlock.data.transactions,
    newBlock.data.coinbaseTransaction
  );

  sendResponse(
    res,
    'The new Block was created successfully!👍',
    RESPONSE_CODES.PASS,
    [header, body]
  );
});

app.get(LAST_BLOCK, express.json(), async (req, res) => {
  const block = await getLastBlock();
  if (block === null) {
    return sendResponse(
      res,
      'No Jitcoin file found!😠',
      RESPONSE_CODES.NO_BLOCK_ON_DISK
    );
  }

  const header = getJSONHeaderFromBlock(block);
  const body = getJSONBody(
    block.data.transactions,
    block.data.coinbaseTransaction
  );

  sendResponse(res, 'Here is the last block!👍', RESPONSE_CODES.PASS, [
    header,
    body
  ]);
});

app.post(GET_BLOCK_BY_HASH, express.json(), async (req, res) => {
  const { hash }: { hash: string } = req.body;

  const block = await getBlockByHash(hash);
  if (block === null) {
    return sendResponse(
      res,
      'No Jitcoin file found!😠',
      RESPONSE_CODES.NO_BLOCK_ON_DISK
    );
  }

  const header = getJSONHeaderFromBlock(block);
  const body = getJSONBody(
    block.data.transactions,
    block.data.coinbaseTransaction
  );

  sendResponse(res, 'Here is the requested block!👍', RESPONSE_CODES.PASS, [
    header,
    [header, body]
  ]);
});

app.get(DELETE_LAST_BLOCK, express.json(), async (req, res) => {
  if (await deleteLastBlock()) {
    sendResponse(res, 'The Block was deleted!👍', RESPONSE_CODES.PASS);
  } else {
    sendResponse(
      res,
      'The Block could not be deleted!😞',
      RESPONSE_CODES.ERROR
    );
  }
});

app.post(LENGTH, express.json(), async (req, res) => {
  const body = req.body;
  const fileNumber = body.file;
  let file = null;

  if (fileNumber !== null) {
    file = jitcoinFileByNumber(fileNumber);
  }

  const count = await lengthLastBlockFile(file);

  if (count !== null) {
    sendResponse(res, 'Length found!👍', RESPONSE_CODES.PASS, count);
  } else {
    sendResponse(res, 'No length found!😞', RESPONSE_CODES.ERROR);
  }
});

app.post(FILE_AS_ARRAY, express.json(), async (req, res) => {
  const body = req.body;
  const fileNumber = body.file;
  let file = null;

  if (fileNumber !== undefined) {
    file = jitcoinFileByNumber(fileNumber);
  }

  const blocks = await getFileAsArray(file);

  if (blocks !== null) {
    const response = [];

    for (const block of blocks) {
      response.push([
        await getJSONHeaderFromBlock(block),
        await getJSONBody(
          block.data.transactions,
          block.data.coinbaseTransaction
        )
      ]);
    }

    sendResponse(res, 'Blocks found!👍', RESPONSE_CODES.PASS, response);
  } else {
    sendResponse(res, 'No Blocks found!😞', RESPONSE_CODES.NO_BLOCK_ON_DISK);
  }
});

app.get(FILE_COUNT, express.json(), async (_req, res) => {
  const count = await getFileCount();

  if (count !== -1) {
    sendResponse(res, 'File count found!👍', RESPONSE_CODES.PASS, count);
  } else {
    sendResponse(
      res,
      'JitCoin Path was not found.😞',
      RESPONSE_CODES.PATH_NOT_FOUND,
      count
    );
  }
});

app.post(CREATE_WALLET, express.json(), async (req, res) => {
  const body = req.body;

  if (await walletExists()) {
    return sendResponse(
      res,
      'There already is a wallet saved on your disk!😞',
      RESPONSE_CODES.WALLET_EXISTS
    );
  }

  if (await createWallet(body.passphrase)) {
    passphrase = body.passphrase;
    sendResponse(
      res,
      'The Wallet was created successfully!👍',
      RESPONSE_CODES.PASSPHRASE_SAVED
    );
  } else {
    sendResponse(
      res,
      'There was an error while creating the wallet.😞',
      RESPONSE_CODES.WALLET_CREATION_ERROR
    );
  }
});

app.post(UNLOCK_WALLET, express.json(), async (req, res) => {
  const body = req.body;
  if (!(await walletExists())) {
    return sendResponse(
      res,
      'There is no wallet saved on your disk. Call /createWallet first!😞',
      RESPONSE_CODES.NO_WALLET
    );
  }

  if (await checkPassphrase(body.passphrase)) {
    passphrase = body.passphrase;
    sendResponse(
      res,
      'The passphrase was saved successfully!👍',
      RESPONSE_CODES.PASSPHRASE_SAVED
    );
  } else {
    sendResponse(
      res,
      'The entered passphrase is incorrect!😞',
      RESPONSE_CODES.WRONG_PASSPHRASE
    );
  }
});

app.get(GET_BALANCE, express.json(), async (_, res) => {
  if (!(await walletExists())) {
    sendResponse(
      res,
      'There is no wallet saved on your disk. Call /createWallet first!😞',
      RESPONSE_CODES.NO_WALLET
    );
    return;
  }

  sendResponse(
    res,
    'Your account balance is:',
    RESPONSE_CODES.PASS,
    await getBalance()
  );
});

/*app.post(VERIFY_SIGNATURE, express.json(), async (req, res) => {
  const body = req.body;
  const signature = body.signature;
  const hash = body.hash;
  const amount = body.amount;

  const publicKey = (await getPublicKey()).toString();

  sendResponse(
    res,
    verifySignature(
      50,
      hash ? hash : getRandomHash(),
      publicKey,
      signature
    ).toString(),
    RESPONSE_CODES.PASS
  );
});*/

app.listen(PORT, () => {
  console.log(`server is up and running! We are listening on ${PORT}`);
});

const sendResponse = (
  res: express.Response,
  message: string,
  code: number,
  data?: object | number | null
) => {
  res.json({
    message,
    code,
    data
  } as BlockResponse);
};
