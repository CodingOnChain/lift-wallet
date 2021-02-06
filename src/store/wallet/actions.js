import * as types from './types.js';
import path from 'path'
import { exec } from 'child_process'
import util from 'util';
const cmd = util.promisify(exec);

const actions = {
  async [types.GET_NEW_MNEMONIC] ({ commit , state}, { wordsNumber }) {
     var wordsAmmountToBeGenerated=state.wordsNumbersAllowed.find(x => x === wordsNumber);
     if(wordsAmmountToBeGenerated==null) throw 'not allowed lenght';     
    
     var cardanoPath= require('path').resolve('./');
     const cardanoPath2 =  path.resolve(cardanoPath, 'cardano') ;
     const addressCli = path.resolve('.', cardanoPath2, process.platform, 'cardano-address');
     var cardano_words = `"${addressCli}" recovery-phrase generate --size ${wordsNumber}`;    
    
     const { stdout, stderr } = await cmd(cardano_words);
     if(stderr) throw stderr;      
    
     var words =stdout.replace('\n', '');
     commit(types.SET_MNEMONIC, words);       
  },
  [types.SET_UP_WALLET]() {
    console.log('set up wallet');
  }
};

export default actions;
