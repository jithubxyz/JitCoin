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
  hash: string | null;
}

export interface BlockBody {
  transactions: TransactionElement[];
}

export interface TransactionElement {
  publicKey: string;
  signature: string;
  randomHash: string;
  amount: number;
}

export interface MiningChild {
  startingNonce: number;
  data: string;
  steps: number;
  zeroCount: number;
}

export interface BlockResponse {
  message: string;
  code: number;
  data: object | null;
}
