

module.exports = {
  "transpileDependencies": [
    "vuetify"
  ],
  //https://nklayman.github.io/vue-cli-plugin-electron-builder/guide/configuration.html#changing-the-output-directory
  pluginOptions: {
    electronBuilder: {
      nodeIntegration: true,
      builderOptions: {
        "mac": {
          "extraFiles": [
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