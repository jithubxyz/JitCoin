/**
 * @author Flo Dörr
 * @date 2019-02-04
 */

export const VERSION = 1;

export const JITCOIN_DIR = './.jitcoin';

export const BLOCKCHAIN_DIR = './.jitcoin/blockchain';

export const JITCOIN_FILE_STARTER = 'blk';

export const JITCOIN_FILE_ENDING = '.jit';

export const JITCOIN_FILE = `${JITCOIN_FILE_STARTER}$${JITCOIN_FILE_ENDING}`;

export const JITCOIN_FILE_ZEROS = 8;

// max file size in bytes (300kb for testing)
export const MAX_FILE_SIZE = 300000;
//export const MAX_FILE_SIZE = 10000000;

// uncommon string to delimit the blocks
export const DELIMITER = 'ĴḯŤ';

// express constants

export const PORT = 7179;