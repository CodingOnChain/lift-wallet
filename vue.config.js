

module.exports = {
  "transpileDependencies": [
    "vuetify"
  ],
  pluginOptions: {
    electronBuilder: {
      nodeIntegration: true,
      builderOptions: {
        appId: "com.electron.lift-wallet",
        productName: "LIFT Wallet",
        nsis: {
          oneClick: false,
          perMachine: true,
          allowToChangeInstallationDirectory: true
        },
        mac: {
          target: "dmg",
          extraFiles: [
            "cardano/macos*/**/*",
            "cardano/configs/**/*"
          ]
        },
        linux: {
          target: "AppImage",
          extraFiles: [
            "cardano/linux*/**/*",
            "cardano/configs/**/*"
          ]
        },
        win: {
          target: "nsis",
          extraFiles: [
            "cardano/win*/**/*",
            "cardano/configs/**/*"
          ]
        }
      }
    }
  }
}
