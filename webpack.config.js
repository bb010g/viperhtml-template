const APP_FOLDER = 'src';

const console = require('consolemd');
const FlowWebpackPlugin = require('flow-webpack-plugin');
const fs = require('fs');
const { join } = require('path');
const nodeExternals = require('webpack-node-externals');
const webpack = require('webpack');

let lastHash = '';

class ViperStatsPlugin {
  // eslint-disable-next-line class-methods-use-this
  apply(compiler) {
    compiler.plugin('done', stats => {
      const json = stats.toJson();
      const sourceMapRegex = /\.map$/;
      if (lastHash === json.hash) {
        return;
      }
      lastHash = json.hash;
      fs.writeFile(
        join(__dirname, APP_FOLDER, 'stats.json'),
        JSON.stringify(json, null, '  '),
        err => {
          if (err) {
            console.error(' #red(✘) unable to write stats.json');
            return;
          }
          Promise.all(
            json.entrypoints.sw.assets.filter(a => !sourceMapRegex.test(a)).map(
              file =>
                new Promise((res, rej) => {
                  fs.readFile(
                    join(__dirname, 'public', 'js', `${json.hash}.wp`, file),
                    (err, data) => (err ? rej(err) : res(data)),
                  );
                }),
            ),
          )
            .catch(_err => console.error(' #red(✘) unable to generate sw.js'))
            .then(files => {
              const content = files.join('\n');
              fs.writeFile(
                join(__dirname, 'public', 'sw.js'),
                `const Bundle=${JSON.stringify({
                  assets: json.entrypoints.bundle.assets,
                  hash: json.hash,
                })};\n${content}`,
                err => {
                  if (err) {
                    console.error(' #red(✘) unable to generate sw.js');
                  } else {
                    console.info(' #green(✔) new */sw.js* available');
                  }
                },
              );
            });
        },
      );
    });
  }
}

const commonModule = {
  rules: [
    {
      test: /\.js$/,
      use: ['babel-loader', 'eslint-loader'],
    },
  ],
};
const commonPlugins = [
  new FlowWebpackPlugin(),
  new webpack.optimize.ModuleConcatenationPlugin(),
  new webpack.optimize.UglifyJsPlugin({ warnings: false, sourceMap: true }),
];
const commonOutput = {
  publicPath: '/js/[hash].wp',
  filename: '[name].js',
  chunkFilename: '[name].[id].js',
};

const clientConfig = {
  devtool: 'source-map',
  module: { ...commonModule },
  plugins: [...commonPlugins, new ViperStatsPlugin()],
  entry: {
    bundle: join(__dirname, APP_FOLDER, 'client', 'index.js'),
    sw: join(__dirname, APP_FOLDER, 'client', 'sw.js'),
  },
  output: {
    ...commonOutput,
    path: join(__dirname, 'public', 'js', '[hash].wp'),
  },
};

const serverConfig = {
  target: 'node',
  node: { __dirname: true },
  externals: [
    nodeExternals(),
    {
      '../stats.json': `require(${JSON.stringify(
        join(__dirname, 'src', 'stats.json'),
      )})`,
    },
  ],
  devtool: 'source-map',
  module: { ...commonModule },
  plugins: [...commonPlugins],
  entry: {
    index: join(__dirname, APP_FOLDER, 'server', 'index.js'),
  },
  output: {
    ...commonOutput,
    path: join(__dirname, 'dist', 'wp'),
  },
};

module.exports = _env => [clientConfig, serverConfig];
