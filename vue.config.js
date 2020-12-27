

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
        win: {
          target: "nsis",
          extraFiles: [
            "cardano/win32/**/*",
            "cardano/configs/**/*"
          ]
        },
        mac: {
          target: "dmg",
          extraFiles: [
            "cardano/darwin/**/*",
            "cardano/configs/**/*"
          ]
        }
      }
    }
  }
}