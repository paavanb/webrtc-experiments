const getRepoInfo = require('git-repo-info')
const webpack = require('webpack')
const HTMLPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const ReactRefreshPlugin = require('@pmmmwh/react-refresh-webpack-plugin')

const gitInfo = getRepoInfo()

module.exports = env => {
  const isDev = env !== 'production'
  const mode = isDev ? 'development' : 'production'
  return {
    entry: `${__dirname}/src`,
    output: {
      publicPath: '/',
    },
    target: 'web',
    node: {
      fs: 'empty',
    },
    plugins: [
      new MiniCssExtractPlugin({filename: isDev ? '[name].css' : '[name].[contenthash].css'}),
      new webpack.EnvironmentPlugin({GIT_REV: gitInfo.sha, NODE_ENV: 'development'}),
      new HTMLPlugin({
        title: 'WebRTC Experiments',
        meta: {
          viewport: 'initial-scale=1',
        },
      }),
      new ReactRefreshPlugin({disableRefreshCheck: true}),
    ].filter(Boolean),
    devtool: isDev ? 'cheap-module-source-map' : 'source-map',
    mode,
    resolve: {
      extensions: ['.tsx', '.ts', '.js', '.json'],
    },
    module: {
      rules: [
        {
          test: /\.(js|ts|tsx)$/,
          use: {
            loader: 'babel-loader',
            options: {cacheDirectory: true, envName: mode},
          },
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: [MiniCssExtractPlugin.loader, 'css-loader'],
        },
        {
          test: /\.(eot|otf|svg|ttf|woff|woff2|gif)$/,
          use: 'file-loader',
        },
      ],
    },
    devServer: {
      historyApiFallback: true,
      host: '0.0.0.0',
      hot: true,
      open: true,
      stats: 'minimal',
      // Support proxied requests within Docker
      disableHostCheck: true,
    },
  }
}
