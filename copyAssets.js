// CommonJS syntax for compatibility
const fs = require('fs-extra');
const path = require('path');

// Copy Cesium assets to public folder
const cesiumSource = './node_modules/cesium/Build/Cesium';
const cesiumDestination = './public/cesium';

try {
  // Make sure destination directory exists
  fs.ensureDirSync(cesiumDestination);
  
  // Copy specific Cesium folders
  fs.copySync(path.join(cesiumSource, 'Workers'), path.join(cesiumDestination, 'Workers'));
  fs.copySync(path.join(cesiumSource, 'Assets'), path.join(cesiumDestination, 'Assets'));
  fs.copySync(path.join(cesiumSource, 'ThirdParty'), path.join(cesiumDestination, 'ThirdParty'));
  fs.copySync(path.join(cesiumSource, 'Widgets'), path.join(cesiumDestination, 'Widgets'));
  
  console.log('Cesium assets copied successfully');
} catch (err) {
  console.error('Error copying Cesium assets:', err);
} 