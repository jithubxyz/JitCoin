/**
 * @author Flo Dörr, Tim Weiß
 * @date 2019-02-06
 */

export interface BlockHeader {
  version: number;
  previousBlockHash: string;
  merkleTree: string;
  time: number;
  nonce: number;
}

export interface BlockBody {
  transactions: [string];
}

export interface TransactionElement {
  userId: string;
  randomHash: string;
  amount: number;
}

export interface MiningChild {
  startingNonce: number;
  data: string;
  steps: number;
  zeroCount: number;
}
