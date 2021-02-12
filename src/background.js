'use strict'
import { spawn } from 'child_process'
import path from 'path'
import { app, protocol, BrowserWindow, ipcMain } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import installExtension, { VUEJS_DEVTOOLS } from 'electron-devtools-installer'
import { 
  setupWalletDir,
  getMnemonic, 
  getAddresses, 
  getBalance,
  getWallets,
  getFee,
  sendTransaction,
  mintToken,
  createWallet,
  getTransactions } from './services/wallet.service.js';
import { 
  cardanoPath,
  cardanoPlatformPath, 
  cardanoNodeOptions,  
  getNetworkInfo, 
  validateAddress } from './cardano'
const isDevelopment = process.env.NODE_ENV !== 'production';

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

async function createWindow() {
  // Create the browser window.
  const win = new BrowserWindow({
    width: 1200,
    height: 900,
    webPreferences: {
      // Use pluginOptions.nodeIntegration, leave this alone
      // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
      nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION
    }
  })

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL)
    //if (!process.env.IS_TEST) win.webContents.openDevTools()
  } else {
    createProtocol('app')
    // Load the index.html when not in development
    win.loadURL('app://./index.html')
  }
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    try {
      await installExtension(VUEJS_DEVTOOLS)
    } catch (e) {
      console.error('Vue Devtools failed to install:', e.toString())
    }
  }
  createWindow()
  setupWalletDir();
})

///Cardano Operations
let cnode = null;
let walletApi = null;

ipcMain.on('req:start-cnode', (event) => {
  //start cardano-node
  if(cnode == null) {
    cnode = spawn(
      path.resolve('.', cardanoPath, cardanoPlatformPath, 'cardano-node'), 
      ['run',...cardanoNodeOptions])
    
    event.reply('res:start-cnode', { 'cnode': path.resolve('.', cardanoPath, cardanoPlatformPath, 'cardano-node') });

    cnode.stdout.on('data', (data) => {
      console.info(`cnode: ${data}`);
    });

    cnode.stderr.on('data', (data) => {
      console.error(`cnode err: ${data}`);
    });
  }
})


ipcMain.on('req:stop-cnode', (event) => {
  if(cnode) {
    cnode.kill();
    cnode = null;
  }
  if(walletApi) {
    walletApi.kill();
    walletApi = null
  }

  event.reply('res:stop-cnode');
})

ipcMain.on('req:get-network', async (event) => {
  const networkInfo = await getNetworkInfo();
  event.reply('res:get-network', { network: networkInfo != null ? networkInfo.data : null })
})

ipcMain.on('req:generate-recovery-phrase', async (event) => {
  try{
    console.info("get phrase")

    const recoveryPhrase = await getMnemonic();
    event.reply('res:generate-recovery-phrase', { isSuccessful: true, data: recoveryPhrase });
  }catch(e) {
    event.reply('res:generate-recovery-phrase', { isSuccessful: false, data: e.toString() });
  }
})


ipcMain.on('req:add-wallet', async (event, args) => {
  try{
    console.log('adding wallet', args)
    await createWallet(args.network, args.name, args.mnemonic, args.passphrase);
    const balance = await getBalance(args.network, args.name);
    const wallet = {
      name: args.name,
      balance: balance
    }
    event.reply('res:add-wallet', { isSuccessful: true, data: wallet });
  }catch(e) {
    event.reply('res:add-wallet', { isSuccessful: false, data: e.toString() });
  }
})


ipcMain.on('req:get-wallets', async (event, args) => {
  const wallets = await getWallets(args.network);
  event.reply('res:get-wallets', { wallets: wallets });
})

ipcMain.on('req:get-wallet', async (event, args) => {
  try{
    const balance = await getBalance(args.network, args.name);
    const wallet = {
      name: args.name,
      balance: balance
    }
    event.reply('res:get-wallet', { isSuccessful: true, data: wallet });
  }catch(e) {
    event.reply('res:get-wallet', { isSuccessful: false, data: e.toString() });
  }
})

ipcMain.on('req:get-addresses', async (event, args) => {
  const addresses = await getAddresses(args.network, args.name);
  event.reply('res:get-addresses', { addresses: addresses });
})

ipcMain.on('req:validate-address', async (event, args) => {
  const address = await validateAddress(args.addressId);
  event.reply('res:validate-addresses', { address: address });
})

ipcMain.on('req:get-fee', async (event, args) => {
  const fee = await getFee(args.network, args.wallet, args.amount, args.address);
  event.reply('res:get-fee', { fee: fee });
})

ipcMain.on('req:send-transaction', async (event, args) => {
  const result = await sendTransaction(args.network, args.wallet, args.amount, args.address, args.passphrase, args.metadata);
  event.reply('res:send-transaction', { transaction: result });
})

ipcMain.on('req:get-transactions', async (event, args) => {
  //const transactions = await getTransactions(args.walletId);
  const transactions = await getTransactions(args.network, args.wallet);
  event.reply('res:get-transactions', { transactions: transactions });
})

//minting assets
ipcMain.on('req:mint-asset', async (event, args) => {
  const result = await mintToken(args.network, args.walletName, args.assetName, args.assetAmount, args.passphrase, args.metadata);
  event.reply('res:mint-asset', { transaction: result });
})

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', (data) => {
      if (data === 'graceful-exit') {
        app.quit()
      }
    })
  } else {
    process.on('SIGTERM', () => {
      app.quit()
    })
  }
}

app.on('quit', () => {
  if(cnode) cnode.kill();
  if(walletApi) walletApi.kill();
})
