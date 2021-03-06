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
  gameType: number;
}

export interface BlockBody {
  coinbaseTransaction: CoinbaseTransactionElement;
  transactions: TransactionElement[];
}

export interface TransactionElement {
  publicKey: string;
  publicKeyHash: string;
  signature: string;
  randomHash: string;
  inputAmount: number;
  outputAmount: number;
}

export interface CoinbaseTransactionElement {
  publicKey: string;
  winningHash: string;
  signature: string;
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
