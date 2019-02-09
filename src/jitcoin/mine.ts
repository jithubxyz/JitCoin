import { createHash } from 'crypto';
const log = require('single-line-log').stdout;

if(process !== undefined){
    process.on('message', async (message: any) => {
        process.send = process.send || (() => {});
        const steps = message.steps;
        let nonce = (message.startingNonce as number) - steps;
        const data = message.data;
        const zeroCount = message.zeroCount;
        let hash = '';
        const workerNumber = message.startingNonce as number;
        let iteration = 0
        while (hash.substring(0, zeroCount) !== getZeroString(zeroCount)) {
          // incrementing the nonce | init value is -1
          nonce += steps;
          //appendFileSync('./test.txt', nonce + ', ');
          // data of the block is being hashed with the nonce
          hash = createHash('sha512')
            .update(data + nonce)
            .digest()
            .toString('hex');
          // just some ouptut...
          if (workerNumber === 0 && nonce % 500000 === 0) {
            log(nonce + '. hash: ' + hash + 'from worker nr. ' + workerNumber);
          }
        }
        console.log('nonce found! It\'s ' + nonce);
        process.send({ nonce, hash });
    });
}

const getZeroString = (zeroCount: number): string => {
  let ret = '';
  for (let i = 0; i < zeroCount; i++) {
    ret += '0';
  }
  return ret;
};