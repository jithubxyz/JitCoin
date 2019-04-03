/**
 * @author Flo Dörr, Tim Weiß
 * @date 2019-02-06
 */

interface ApiResponse {
  code: number;
}

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

export interface BlockResponse extends ApiResponse {
  message: string;
  data: object | null | any;
}

// P2P Interfaces

export interface StatusResponse extends ApiResponse {
  lastBlockHash: string;
}