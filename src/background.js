'use strict'

import { spawn } from 'child_process'
import path from 'path'
import { app, protocol, BrowserWindow, ipcMain } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import installExtension, { VUEJS_DEVTOOLS } from 'electron-devtools-installer'
import { cardanoPath, cardanoNodeOptions, walletServeOptions, walletServeEnvs, getNetworkInfo } from './cardano'
const isDevelopment = process.env.NODE_ENV !== 'production'

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

async function createWindow() {
  // Create the browser window.
  const win = new BrowserWindow({
    width: 800,
    height: 600,
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
})

///Cardano Operations
let cnode = null;
let walletApi = null;

ipcMain.on('req:start-cnode', (event, args) => {
  //start cardano-node
  if(cnode == null) {
    cnode = spawn(
      path.resolve('.', cardanoPath, process.platform, 'cardano-node'), 
      ['run',...cardanoNodeOptions])
    //start cardano-wallet serve
    walletApi = spawn(
      path.resolve('.', cardanoPath, process.platform, 'cardano-wallet'), 
      ['serve',...walletServeOptions], 
      walletServeEnvs)
      
    event.reply('res:start-cnode', { 'cnode': cnode.pid });

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

ipcMain.on('generate-recovery-phrase', (event, args) => {

})

ipcMain.on('add-wallet', (event, args) => {

})

ipcMain.on('get-wallet', (event, args) => {

})

ipcMain.on('get-addresses', (event, args) => {

})

ipcMain.on('get-fee', (event, args) => {

})

ipcMain.on('send-transaction', (event, args) => {

})

ipcMain.on('get-transactions', (event, args) => {

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
  if(!!cnode) cnode.kill();
  if(!!walletApi) walletApi.kill();
})
