const path = require('path');

module.exports = {
  // Define the entry point of your application
  entry: './src/app.js',

  // Specify the output configuration
  output: {
    path: path.resolve(__dirname, 'public'), // Output files to the 'public' directory
    filename: 'bundle.js', // Name of the bundled file
  },

  // Configure how modules are resolved
  module: {
    rules: [
      {
        test: /\.js$/, // Apply this rule to JavaScript files
        exclude: /node_modules/, // Do not apply the rule to files in node_modules
        use: {
          loader: 'babel-loader', // Use babel-loader to process these files
          options: {
            presets: ['@babel/preset-env'], // Use the preset-env Babel preset
          },
        },
      },
      // Add more loaders here if you need to load other types of files like CSS or images
    ],
  },

  // Development tooling configurations
  devtool: 'source-map', // Generate source maps

  // Development server configuration
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'), // Serve content from the 'public' directory
    },
    compress: true, // Enable gzip compression
    port: 3000, // Serve on port 3000
    open: true, // Open the browser after the server starts
  },
};
