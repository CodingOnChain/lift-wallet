'use strict'
import { spawn } from 'child_process'
import path from 'path'
import { app, protocol, BrowserWindow, ipcMain } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import installExtension, { VUEJS_DEVTOOLS } from 'electron-devtools-installer'
import { 
  cardanoPath, 
  cardanoNodeOptions, 
  walletServeOptions, 
  walletServeEnvs, 
  getNetworkInfo, 
  getPhrase, 
  createWallet,
  getWallets,
  getWallet,
  getTransactions,
  getAddresses,
  validateAddress,
  getTransactionFee,
  createTransactions } from './cardano'
import { initiateRegistration } from './lift'
import { setupLiftDb, addVoter } from './lift-db'

const isDevelopment = process.env.NODE_ENV !== 'production'

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
  await setupLiftDb();
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

///Cardano Operations
let cnode = null;
let walletApi = null;

app.on('quit', () => {
  if(!!cnode) cnode.kill();
  if(!!walletApi) walletApi.kill();
})

ipcMain.on('req:start-cnode', (event, args) => {
  //start cardano-node
  if(cnode == null) {
    cnode = spawn(
      path.resolve('.', cardanoPath, process.platform, 'cardano-node'), 
      ['run',...cardanoNodeOptions])

    console.log(path.resolve('.', cardanoPath, process.platform, 'cardano-node'), 'run', cardanoNodeOptions.join(' '))
    //start cardano-wallet serve
    walletApi = spawn(
      path.resolve('.', cardanoPath, process.platform, 'cardano-wallet'), 
      ['serve',...walletServeOptions], 
      walletServeEnvs)
    console.log(path.resolve('.', cardanoPath, process.platform, 'cardano-wallet'), 'serve', walletServeOptions.join(' '))
    
    event.reply('res:start-cnode', { 'cnode': path.resolve('.', cardanoPath, process.platform, 'cardano-node') });

    cnode.stdout.on('data', (data) => {
      console.info(`cnode: ${data}`);
    });

    cnode.stderr.on('data', (data) => {
      console.error(`cnode err: ${data}`);
    });

    walletApi.stdout.on('data', (data) => {
      console.info(`wallet-api: ${data}`);
    });

    walletApi.stderr.on('data', (data) => {
      console.error(`wallet-api err: ${data}`);
    });
  }
})

ipcMain.on('req:stop-cnode', (event, args) => {
  if(!!cnode) {
    cnode.kill();
    cnode = null;
  }
  if(!!walletApi) {
    walletApi.kill();
    walletApi = null
  }

  event.reply('res:stop-cnode');
})

ipcMain.on('req:get-network', async (event, args) => {
  const networkInfo = await getNetworkInfo();
  event.reply('res:get-network', { network: networkInfo != null ? networkInfo.data : null })
})

ipcMain.on('req:generate-recovery-phrase', async (event, args) => {
  console.info("get phrase")
  const recoveryPhrase = await getPhrase();
  event.reply('res:generate-recovery-phrase', recoveryPhrase);
})

ipcMain.on('req:add-wallet', async (event, args) => {
  const wallet = await createWallet(args.name, args.mnemonic, args.passphrase);
  event.reply('res:add-wallet', { wallet:wallet });
})

ipcMain.on('req:get-wallets', async (event, args) => {
  const wallets = await getWallets();
  event.reply('res:get-wallets', { wallets: wallets });
})

ipcMain.on('req:get-wallet', async (event, args) => {
  const wallet = await getWallet(args.walletId);
  event.reply('res:get-wallet', { wallet: wallet });
})

ipcMain.on('req:get-addresses', async (event, args) => {
  const addresses = await getAddresses(args.walletId);
  event.reply('res:get-addresses', { addresses: addresses });
})

ipcMain.on('req:validate-address', async (event, args) => {
  const address = await validateAddress(args.addressId);
  event.reply('res:validate-addresses', { address: address });
})

ipcMain.on('req:get-fee', async (event, args) => {
  const transaction = {
    payments: [
      {
        address: args.address,
        amount: {
          quantity: args.amount,
          unit: "lovelace"
        }
      }
    ],
    time_to_live: {
      quantity: 500,
      unit: "second"
    }
  };

  const fee = await getTransactionFee(args.walletId, transaction);
  event.reply('res:get-fee', { fee: fee });
})

ipcMain.on('req:send-transaction', async (event, args) => {

  const transaction = {
    passphrase: args.passphrase,
    payments: [
      {
        address: args.address,
        amount: {
          quantity: args.amount,
          unit: "lovelace"
        }
      }
    ],
    metadata: {
      700: {
        "map": [
          { 
            "k": { "string": "Service" },
            "v": { "string": "LIFT" }
          }
        ]
      },
      701: {
        "map": [
          { 
            "k": { "string": "Action" },
            "v": { "string": "Registration" }
          }
        ]
      },
      702: {
        "map": [
          { 
            "k": { "string": "VoterId" },
            "v": { "string": "94b606c3-cad5-4a98-a323-0942f4b4f0db" }
          }
        ]
      }
    },
    time_to_live: {
      quantity: 500,
      unit: "second"
    }
  };

  const result = await createTransactions(args.walletId, transaction);
  event.reply('res:send-transaction', { transaction: result });
})

ipcMain.on('req:get-transactions', async (event, args) => {
  const transactions = await getTransactions(args.walletId);
  event.reply('res:get-transactions', { transactions: transactions });
})

ipcMain.on('req:initiate-registration', async (event, args) => {
  //1 lift-api - init registration
  //2 send transaction with guid/voterid from init reg
  //3. store voter id in sqlite
  //3 return success with
  
  //initiate a new voter registration
  var voterRes = await initiateRegistration();
  //save the pending voter record
  await addVoter(voterRes.voterId, args.walletId, 0);
  //send transactions
  const transaction = await createTransactions(
    args.walletId, 
    {
      passphrase: args.passphrase,
      payments: [
        {
          address: args.address,
          amount: {
            quantity: args.amount,
            unit: "lovelace"
          }
        }
      ],
      metadata: {
        700: {
          "map": [
            { 
              "k": { "string": "Service" },
              "v": { "string": "LIFT" }
            }
          ]
        },
        701: {
          "map": [
            { 
              "k": { "string": "Action" },
              "v": { "string": "Registration" }
            }
          ]
        },
        702: {
          "map": [
            { 
              "k": { "string": "VoterId" },
              "v": { "string": voterRes.voterId }
            }
          ]
        }
      },
      time_to_live: {
        quantity: 500,
        unit: "second"
      }
    });

  event.reply('res:initiate-registration', { voterId: voterRes.voterId, transaction: transaction.id });
})

ipcMain.on('req:send-registration', async () => {

});

ipcMain.on('req:initiate-create-ballot', async () => {

});

ipcMain.on('req:send-create-ballot', async () => {

});

ipcMain.on('req:initiate-cast-ballot', async () => {

});

ipcMain.on('req:send-cast-ballot', async () => {

});

// {
  //   0: {
  //     "map": [
  //       { 
  //         "k": { "string": "BallotID" },
  //         "v": { "string": "some-unqiue-ballot-id" }
  //       }
  //     ]
  //   },
  //   1: {
  //     "map": [
  //       { 
  //         "k": { "string": "Service" },
  //         "v": { "string": "LIFT Ballots" }
  //       }
  //     ]
  //   },
  //   2: {
  //     "map": [
  //       { 
  //         "k": { "string": "Author" },
  //         "v": { "string": "some-unqiue-author-id" }
  //       }
  //     ]
  //   },
  //   3: {
  //     "list": [
  //       {
  //         "map": [
  //         { 
  //             "k": { "string": "Question" },
  //             "v": { "string": "Some question 1" }
  //           },
  //           { 
  //             "k": { "string": "Type" },
  //             "v": { "string": "Single" }
  //           },
  //           {
  //             "k": { "string": "Choices" },
  //             "v": { 
  //               "list": [
  //                 { 
  //                   "string": "Some Choice 1" 
  //                 },
  //                 { 
  //                   "string": "Some Another Choice 1" 
  //                 }
  //               ]
  //             }
  //           }
  //         ]
  //       },
  //       {
  //         "map": [
  //         { 
  //             "k": { "string": "Question" },
  //             "v": { "string": "Some question 2" }
  //           },
  //           { 
  //             "k": { "string": "Type" },
  //             "v": { "string": "Multiple" }
  //           },
  //           {
  //             "k": { "string": "Choices" },
  //             "v": { 
  //               "list": [
  //                 { 
  //                   "string": "Some Choice2" 
  //                 },
  //                 { 
  //                   "string": "Some Another Choice2" 
  //                 }
  //               ]
  //             }
  //           }
  //         ]
  //       }
  //     ]
  //   }
  // }
  // var ballotJson = {
  //   BallotID: "some-unique-ballot-id",
  //   Service: "LIFT Ballots",
  //   Author: "some-unique-author-id",
  //   Questions: [
  //     {
  //       Question: "Question #1",
  //       Type: "Single",
  //       Choices: ["Choice 1-1", "Choice 1-2"]
  //     },
  //     {
  //       Question: "Question #2",
  //       Type: "Multiple",
  //       Choices: ["Choice 2-1", "Choice 2-2"]
  //     }
  //   ]
  // };