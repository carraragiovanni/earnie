const path = require('path');

module.exports = {
  mode: 'production', // 'development' or 'production'
  entry: './src/app.js', // Entry point of your application
  output: {
    path: path.resolve(__dirname, 'public'), // Output directory
    filename: 'bundle.js', // Output bundle file
  },
  module: {
    rules: [
      {
        test: /\.js$/, // Apply rule to JavaScript files
        exclude: /node_modules/, // Exclude the node_modules directory
        use: {
          loader: 'babel-loader', // Use Babel loader for transpiling
          options: {
            presets: ['@babel/preset-env'], // Preset used for transpiling
          },
        },
      },
      // Add other loaders here for CSS, images, etc.
    ],
  },
  // Optionally configure the webpack-dev-server
  devServer: {
    contentBase: path.join(__dirname, 'public'), // Serve content from the 'public' directory
    compress: true, // Enable gzip compression
    port: 9000, // Port to serve on
    open: true, // Open the browser after server has been started
  },
};
