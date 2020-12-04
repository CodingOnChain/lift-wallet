

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
            "cardano/mac/**/*"
          ]
        }
      }
    }
  }
}