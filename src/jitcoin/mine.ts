import { MiningChild } from '../misc/interfaces';
import { getBlockHash, getZeroString, isHashMined } from '../misc/helper';
import { stdout as log } from 'single-line-log';
import { DIFFICULTY } from '../misc/constants';

if (process !== undefined && !process.send) {
  console.log('hi!');
  process.on('message', async (message: MiningChild) => {
    console.log('before check');
    process.send = process.send!;
    console.log('after check');
    const steps = message.steps;
    let nonce = message.startingNonce - steps;
    const data = message.data;
    let hash = '';
    const workerNumber = message.startingNonce;
    console.log(data);
    while (!isHashMined(hash)) {
      // incrementing the nonce | init value is -1
      nonce += steps;
      // data of the block is being hashed with the nonce
      hash = getBlockHash(data, nonce);
      // just some ouptut...
      if (workerNumber === 0 && nonce % 500000 === 0) {
        log(`${nonce}. hash: ${hash} from worker nr. ${workerNumber}`);
      }
    }
    console.log(`nonce found! It's ${nonce}`);
    process.send({ nonce, hash });
  });
}
