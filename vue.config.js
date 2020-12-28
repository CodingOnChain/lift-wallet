

module.exports = {
  "transpileDependencies": [
    "vuetify"
  ],
  //https://nklayman.github.io/vue-cli-plugin-electron-builder/guide/configuration.html#changing-the-output-directory
  pluginOptions: {
    electronBuilder: {
      nodeIntegration: true,
      builderOptions: {
        appId: "com.electron.lift-wallet",
        productName: "LIFT Wallet",
        win: {
          target: "nsis",
          extraFiles: [
            "cardano/win32/**/*",
            "cardano/configs/**/*"
          ]
        },
        nsis: {
          oneClick: false,
          perMachine: true,
          allowToChangeInstallationDirectory: true
        },
        mac: {
          target: "dmg",
          extraFiles: [
            "cardano/darwin/**/*",
            "cardano/configs/**/*"
          ]
        },
        "win": {
          "extraFiles": [
            "cardano/win32/**/*",
            "cardano/configs/**/*"
          ]
        }
      }
    }
  }
}