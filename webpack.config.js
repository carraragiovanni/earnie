const path = require('path');

module.exports = {
  mode: 'production', // 'development' or 'production'
  entry: './src/app.js', // Entry point of your application
  output: {
    path: path.resolve(__dirname, 'dist'), // Output directory adjusted to 'dist'
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
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'), // Serve content from 'public'
      watch: true, // Watch for changes in the 'public' directory
    },
    compress: true,
    port: 9000,
    open: true,
    watchFiles: ['src/**/*', 'dist/**/*'], // Watch for changes in 'src' and 'dist' directories
  },
  // Configure plugins if needed (e.g., HtmlWebpackPlugin, CleanWebpackPlugin, etc.)
};
