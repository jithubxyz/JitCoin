import * as express from 'express';
import {
  PORT,
  TRANSACTIONS_PER_BLOCK,
  RESPONSE_CODES,
  DIFFICULTY,
  MINE,
  ADD_TRANSACTION,
  LAST_BLOCK,
  VERIFY_SIGNATURE,
  FILE_COUNT,
  FILE_AS_ARRAY,
  LENGTH,
  DELETE_LAST_BLOCK,
  NEW_BLOCK,
  CREATE_WALLET,
  UNLOCK_WALLET,
  GET_BLOCK_BY_HASH
} from './misc/constants';
import {
  getRandomHash,
  getLastBlock,
  updateLastBlockData,
  getJSONBody,
  getBlockHash,
  getJSONHeaderFromBlock,
  isHashMined,
  deleteLastBlock,
  lengthLastBlockFile,
  jitcoinFileByNumber,
  getFileAsArray,
  getFileCount,
  getPublicKey,
  verifySignature,
  verifyBlock,
  walletExists,
  createWallet,
  checkPassphrase,
  verifyReward,
  getBlockByHash
} from './misc/helper';
import { Transaction, Data, Block } from './jitcoin/block';
import { BlockResponse } from './misc/interfaces';

let passphrase: string;

const app = express();

app.get(MINE, express.json(), async (_, res) => {
  const block = await getLastBlock();

  if (block !== null) {
    const valid = verifyBlock(block);
    if (valid[0] === true) {
      if (valid[1] === true) {
        if (valid[2] === -1) {
          const reward = verifyReward(block);
          if (reward.length === 2) {
            await block.mine();

            const header = getJSONHeaderFromBlock(block);
            const body = getJSONBody(block.data.transactions);

            sendResponse(
              res,
              `Block was mined successfully! You gained a reward of ${reward[1]} JitCoins!⛏️`,
              RESPONSE_CODES.PASS,
              [header, body]
            );
          } else {
            sendResponse(
              res,
              `The input/output values are wrong in the following block: ${reward}!😞`,
              RESPONSE_CODES.INVALID_SIGNATURE
            );
          }
        } else {
          sendResponse(
            res,
            `The signature of Block number ${valid[2]} is invalid!😞`,
            RESPONSE_CODES.INVALID_SIGNATURE
          );
        }
      } else {
        sendResponse(res, 'This Block is not full!😞', RESPONSE_CODES.NOT_FULL);
      }
    } else {
      sendResponse(
        res,
        'This Block was already mined!😞',
        RESPONSE_CODES.ALREADY_MINED
      );
    }
  } else {
    sendResponse(
      res,
      'There is no Block saved on your disk!😞',
      RESPONSE_CODES.NO_BLOCK_ON_DISK
    );
  }
});

app.post(ADD_TRANSACTION, express.json(), async (req, res) => {
  const body = req.body;
  const inputAmount: number | undefined = body.inputAmount;
  const outputAmount: number | undefined = body.outputAmount;

  if (passphrase !== undefined) {
    if (inputAmount !== undefined && outputAmount !== undefined) {
      const randomHash: string = getRandomHash();
      const block = await getLastBlock();

      if (block !== null) {
        if (
          block.hash === '' &&
          block.data.transactions.length < TRANSACTIONS_PER_BLOCK
        ) {
          const transaction = new Transaction(
            (await getPublicKey()).toString(),
            randomHash,
            inputAmount,
            outputAmount,
          );
          await transaction.sign(passphrase);

          if (await updateLastBlockData(transaction)) {
            const block = (await getLastBlock())!;

            const header = getJSONHeaderFromBlock(block);
            const body = getJSONBody(block.data.transactions);

            sendResponse(
              res,
              'Transaction was added successfully!😁',
              RESPONSE_CODES.PASS,
              [header, body]
            );
          } else {
            sendResponse(res, 'An error ocurred!😞', RESPONSE_CODES.ERROR);
          }
        } else {
          if (
            block.hash === '' &&
            block.data.transactions.length >= TRANSACTIONS_PER_BLOCK
          ) {
            sendResponse(
              res,
              'The last block is already full and has to be mined first!😞',
              RESPONSE_CODES.MINE_BLOCK
            );
          } else if (block.hash !== '') {
            sendResponse(
              res,
              'The last block was already mined but no new block was created yet!😞',
              RESPONSE_CODES.NEW_BLOCK
            );
          }
        }
      } else {
        sendResponse(
          res,
          'No Jitcoin file found!😠',
          RESPONSE_CODES.NO_BLOCK_ON_DISK
        );
      }
    } else {
      sendResponse(
        res,
        'No inputAmount or outputAmount parameter was provided!😞',
        RESPONSE_CODES.NO_AMOUNT_PROVIDED
      );
    }
  } else {
    sendResponse(
      res,
      'No passphrase found. Try to /unlockWallet first!😞',
      RESPONSE_CODES.NO_PASSPHRASE
    );
  }
});

app.get(LAST_BLOCK, express.json(), async (req, res) => {
  const block = await getLastBlock();

  if (block !== null) {
    const header = getJSONHeaderFromBlock(block);
    const body = getJSONBody(block.data.transactions);

    sendResponse(res, 'Here is the last block!👍', RESPONSE_CODES.PASS, [
      header,
      body
    ]);
  } else {
    sendResponse(
      res,
      'No Jitcoin file found!😠',
      RESPONSE_CODES.NO_BLOCK_ON_DISK
    );
  }
});

app.get(GET_BLOCK_BY_HASH, express.json(), async(req,res) => {
  const body = req.body();
  const hash: string = body.hash;

  const block = await getBlockByHash(hash);

  if (block !== null) {
    const header = getJSONHeaderFromBlock(block);
    const body = getJSONBody(block.data.transactions);

    sendResponse(res, 'Here is the requested block!👍', RESPONSE_CODES.PASS, [
      header,
      [header, body]
    ]);
  } else {
    sendResponse(
      res,
      'No Jitcoin file found!😠',
      RESPONSE_CODES.NO_BLOCK_ON_DISK
    );
  }

});

app.post(NEW_BLOCK, express.json(), async (req, res) => {
  const lastBlock = await getLastBlock();
  const body = req.body;
  const inputAmount: number | undefined = body.inputAmount;
  const outputAmount: number | undefined = body.outputAmount;

  if (passphrase !== undefined) {
    if (inputAmount !== undefined && outputAmount !== undefined) {
      let previousHash: string | null = null;

      if (lastBlock !== null) {
        previousHash = getBlockHash(lastBlock.data.getData(), lastBlock.nonce);
      }

      if (isHashMined(previousHash)) {
        const transaction = new Transaction(
          (await getPublicKey()).toString(),
          getRandomHash(),
          inputAmount,
          outputAmount,
        );
        await transaction.sign(passphrase);

        const data = new Data(transaction);
        const block = new Block(previousHash, data);
        await block.save();

        const header = getJSONHeaderFromBlock(block);
        const body = getJSONBody(block.data.transactions);

        sendResponse(
          res,
          'The new Block was created successfully!👍',
          RESPONSE_CODES.PASS,
          [header, body]
        );
      } else {
        sendResponse(
          res,
          'The previous block was not mined!😠',
          RESPONSE_CODES.NOT_YET_MINED
        );
      }
    } else {
      sendResponse(
        res,
        'No inputAmount or outputAmount parameter was provided!😞',
        RESPONSE_CODES.NO_AMOUNT_PROVIDED
      );
    }
  } else {
    sendResponse(
      res,
      'No passphrase found. Try to /unlockWallet first!😞',
      RESPONSE_CODES.NO_PASSPHRASE
    );
  }
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
        await getJSONBody(block.data.transactions)
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

  if (!(await walletExists())) {
    if (await createWallet(body.passphrase)) {
      passphrase = body.passphrase;
      sendResponse(res, 'The Wallet was created successfully!👍', RESPONSE_CODES.PASSPHRASE_SAVED);
    } else {
      sendResponse(res, 'There was an error while creating the wallet.😞', RESPONSE_CODES.WALLET_CREATION_ERROR);
    }
  } else {
    sendResponse(res, 'There already is a wallet saved on your disk!😞', RESPONSE_CODES.WALLET_EXISTS);
  }
});

app.post(UNLOCK_WALLET, express.json(), async (req, res) => {
  const body = req.body;
  if (await walletExists()) {
    if (await checkPassphrase(body.passphrase)) {
      passphrase = body.passphrase;
      sendResponse(res, 'The passphrase was saved successfully!👍', RESPONSE_CODES.PASSPHRASE_SAVED);
    } else {
      sendResponse(res, 'The entered passphrase is incorrect!😞', RESPONSE_CODES.WRONG_PASSPHRASE);
    }
  } else {
    sendResponse(res, 'There is no wallet saved on your disk. Call /createWallet first!😞', RESPONSE_CODES.NO_WALLET);
  }
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
