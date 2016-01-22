module.exports = {
  context: __dirname,
  entry: "./client.js",

  output: {
    filename: "client-bundle.js",
    path: __dirname + "/build",
  },

  module: {
    loaders: [{
      test: /\.js$/,
      exclude: /node_modules/,
      loader: "babel-loader",
      query: {
        cacheDirectory: true,
        presets: ['es2015']
      }
    }]
  }
}

