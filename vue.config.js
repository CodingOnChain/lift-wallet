

module.exports = {
  "transpileDependencies": [
    "vuetify"
  ],
  pluginOptions: {
    electronBuilder: {
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