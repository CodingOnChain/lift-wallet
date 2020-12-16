

module.exports = {
  "transpileDependencies": [
    "vuetify"
  ],
  pluginOptions: {
    electronBuilder: {
      nodeIntegration: true,
      builderOptions: {
        "mac": {
          "extraFiles": [
            "cardano/darwin/**/*",
            "cardano/configs/**/*"
          ]
        }
      }
    }
  }
}