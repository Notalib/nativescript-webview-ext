'use strict'

const path = require('path');
const fs = require('fs-extra');

function fixOptions(data) {
  for (const key of Object.keys(data)) {
    let value = data[key];
    if (typeof value === 'object') {
      data[value] = fixOptions(value);
    } else if (typeof value === 'string') {
      if (value === 'false') {
        data[key] = false;
      } else if (value === 'true') {
        data[key] = true;
      } else if ( /^[0-9]+(\.[0-9]+)?$/.test(value)) {
        data[key] = Number(value);
      }
    }

    return data;
  }
}

module.exports = function($projectData) {
  const appPath = $projectData.appDirectoryPath;
  const $options = $projectData.$options;

  const options = fixOptions(Object.assign({}, $options.argv.env));

  const config = path.join(appPath, 'environment.json');

  let oldData = null;
  if (fs.existsSync(config)) {
    oldData = fs.readFileSync(config, 'UTF-8');
  }

  const dataJSON = JSON.stringify(options || {}, null, 2);
  if (oldData && oldData === dataJSON) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    fs.writeFile(config, dataJSON, err => {
      if (err) {
        return reject(err);
      }

      console.log('Successfully created:', config);

      resolve(config);
    });

  });

};
