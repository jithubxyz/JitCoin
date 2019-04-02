/**
 * @author Flo Dörr
 * @date 2019-02-04
 */

export const VERSION = 1;

export const TRANSACTIONS_PER_BLOCK = 10;

export const DIFFICULTY = 1;

export const JITCOIN_DIR = './.jitcoin';

export const BLOCKCHAIN_DIR = `${JITCOIN_DIR}/blockchain`;

export const WALLET_DIR = `${JITCOIN_DIR}/wallet`;

export const JITCOIN_FILE_STARTER = 'blk';

export const JITCOIN_FILE_ENDING = '.jit';

export const WALLET_FILE_STARTER = 'wallet';

export const PUBLIC_KEY_FILE_ENDING = '.pub.jit';

export const PRIVATE_KEY_FILE_ENDING = '.priv.jit';

export const JITCOIN_FILE = `${JITCOIN_FILE_STARTER}$${JITCOIN_FILE_ENDING}`;

export const JITCOIN_FILE_ZEROS = 8;

// max file size in bytes (300kb for testing)
export const MAX_FILE_SIZE = 300000;
//export const MAX_FILE_SIZE = 10000000;

// uncommon string to delimit the blocks
export const DELIMITER = 'ĴḯŤ';

// express constants

export const PORT = 7179;

export enum RESPONSE_CODES {
  PASS,
  MINE_BLOCK,
  NEW_BLOCK,
  SAVING_ERROR,
  NO_AMOUNT_PROVIDED,
  ERROR,
  MINING_ERROR,
  NO_BLOCK_ON_DISK,
  ALREADY_MINED,
  NOT_FULL,
  NOT_YET_MINED,
  PATH_NOT_FOUND,
  PASSPHRASE_SAVED,
  NO_PASSPHRASE,
}
