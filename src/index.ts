import * as express from 'express';
import { PORT } from './misc/constants';
import { getRandomHash, getLastBlock } from './misc/helper';
import { Transaction } from './jitcoin/block';
const app = express();

app.post('/mine', express.json(), async (req, res) => {
  const amount = req.body.amount;
  res.send(req.body.test);

  //res.send('JIT!');
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
    if (block.hash === '') {
      const transaction = new Transaction(userId, randomHash, amount);
      block!!.data.addTransaction(transaction);
      await block.save();
    } else {
      console.log(block.hash);

      res.send('The last block was already mined!');
    }
  } else {
    res.send('No Jitcoin file found!');
  }
});

app.listen(PORT, () => {
  console.log(`server is up and running! We are listening on ${PORT}`);
});
