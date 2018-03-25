// vim: set et sw=2 ts=2:
//
// This file is part of Moonfire NVR, a security camera digital video recorder.
// Copyright (C) 2018 Dolf Starreveld <dolf@starreveld.com>
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// In addition, as a special exception, the copyright holders give
// permission to link the code of portions of this program with the
// OpenSSL library under certain conditions as described in each
// individual source file, and distribute linked combinations including
// the two.
//
// You must obey the GNU General Public License in all respects for all
// of the code used other than OpenSSL. If you modify file(s) with this
// exception, you may extend this exception to your version of the
// file(s), but you are not obligated to do so. If you do not wish to do
// so, delete this exception statement from your version. If you delete
// this exception statement from all source files in the program, then
// also delete it here.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

const webpack = require('webpack');
const CompressionPlugin = require('compression-webpack-plugin');
const NVRSettings = require('./NVRSettings');
const baseConfig = require('./base.config.js');

const CleanWebpackPlugin = require('clean-webpack-plugin');

module.exports = (env, args) => {
  const settingsObject = new NVRSettings(env, args);
  const nvrSettings = settingsObject.settings;

  return settingsObject.webpackMerge(baseConfig, {
    devtool: 'cheap-module-source-map',
    module: {
      rules: [
        {
          test: /\.html$/,
          loader: 'html-loader',
          query: {
            minimize: true,
          },
        },
      ],
    },
    optimization: {
      minimize: true,
      minimizer: [
        {
          apply: (compiler) => {
            /**
             * Setup the UglifyJsPlugin as webpack4 does, plus options
             * we decide to override.
             */
            // Lazy load the uglifyjs plugin
            const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
            new UglifyJsPlugin({
              cache: true, // webpack4: default
              parallel: true, // webpack4: default
              sourceMap:
                (args.devtool && /source-?map/.test(args.devtool)) ||
                (args.plugins &&
                  args.plugins.some(
                    (p) => p instanceof webpack.SourceMapDevToolPlugin
                  )),
              uglifyOptions: {
                compress: {
                  drop_console: true, // Remove all console.log etc.
                  keep_infinity: true, // Do not change to 1/0
                  warnings: false, // Do not warn when dropping
                },
                output: {
                  // Eliminate most comments, but not marked ones
                  comments: 'some',
                },
              },
            }).apply(compiler);
          },
        },
      ],
      splitChunks: {
        minSize: 30000,
        minChunks: 1,
        maxAsyncRequests: 5,
        maxInitialRequests: 4,
        cacheGroups: {
          'default': {
            minChunks: 2,
            priority: -20,
          },
          'jquery-ui': {
            test: /[\\/]node_modules[\\/]jquery-ui[\\/]/,
            name: 'jquery-ui',
            chunks: 'all',
            priority: -5,
          },
          'jquery': {
            test: /[\\/]node_modules[\\/]jquery[\\/]/,
            name: 'jquery',
            chunks: 'all',
            priority: -5,
          },
          'vendors': {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendor',
            chunks: 'all',
            priority: -10,
          },
        },
      },
    },
    plugins: [
      new CleanWebpackPlugin([nvrSettings.dist_dir], {
        root: nvrSettings._paths.project_root,
      }),
      new CompressionPlugin({
        asset: '[path].gz[query]',
        algorithm: 'gzip',
        test: /\.js$|\.css$|\.html$/,
        threshold: 10240,
        minRatio: 0.8,
      }),
    ],
  });
};
