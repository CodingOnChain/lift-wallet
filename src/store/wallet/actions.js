import * as types from './types.js';
const { ipcRenderer } = require('electron')

const actions = {
  async [types.GET_NEW_MNEMONIC] ({ state}, { wordsNumber }) {
     var wordsAmmountToBeGenerated=state.wordsNumbersAllowed.find(x => x === wordsNumber);
     if(wordsAmmountToBeGenerated==null) throw 'not allowed lenght';           
     ipcRenderer.send('req:generate-recovery-phrase');
  },
  [types.SET_UP_WALLET]({commit}) {
    console.log('set up wallet');    
    ipcRenderer.on('res:generate-recovery-phrase', (_, args) => {
      console.log('phrase', args);
      if (args.isSuccessful) {
        console.log("arg data",args.data);
        commit(types.SET_MNEMONIC, args.data);     
      } else {
        console.log(args.data)
      }
    })
  }  
};

export default actions;
