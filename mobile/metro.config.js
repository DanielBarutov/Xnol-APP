const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const config = getDefaultConfig(__dirname)

config.resolver.nodeModulesPaths = [
  ...(config.resolver.nodeModulesPaths ?? []),
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '../node_modules'),
]

config.watchFolders = [
  ...(config.watchFolders ?? []),
  path.resolve(__dirname, '../shared'),
]

module.exports = config
