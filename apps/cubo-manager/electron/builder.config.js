module.exports = {
  appId: 'com.cubomanager.desktop',
  productName: 'CuboManager',
  directories: {
    output: 'dist',
    buildResources: 'electron/resources',
  },
  files: [
    'build/**/*',
    'electron/**/*',
    'package.json',
  ],
  win: {
    target: ['nsis'],
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowElevation: true,
    allowToChangeInstallationDirectory: true,
  },
};
