import * as cp from 'child_process';
import 'tslib';
import * as util from 'util';

export interface IOSSimulatorInstance {
  state: string;
  availability: string;
  name: string;
  udid: string;
}

export interface IOSDeviceList {
  devices: {
    [deviceName: string]: Array<IOSSimulatorInstance>;
  };
}

function listIOSSimulators() {
  const output = [] as { name: string, os: string, udid: string }[];
  try {
    cp.execSync('which xcrun 2>&1 > /dev/null');
  } catch (err) {
    return output;
  }
  const execResult = cp.execSync('xcrun simctl list devices --json').toString();

  const devices = (JSON.parse(execResult) as IOSDeviceList).devices;
  let numAvailable = 0;
  for (const key of Object.keys(devices)) {
    if (key.startsWith('com.') || key.startsWith('tvOS') || key.startsWith('watchOS') || key.endsWith('8.4')) {
      delete devices[key];
      continue;
    }

    const instances = [] as IOSSimulatorInstance[];
    for (const instance of devices[key]) {
      if (instance.availability.toLowerCase().indexOf('unavailable') !== -1) {
        continue;
      }

      if (instance.name === 'iPhone 6') {
        instances.push(instance);
        output.push({
          name: instance.name,
          udid: instance.udid,
          os: key,
        });
      }
    }
    numAvailable += instances.length;
    devices[key] = instances;
  }

  return output;
}
// console.log(listIOSSimulators());

function listAndroidEmulators() {
  const output = [] as { name: string, os: string, udid: string }[];

  const cmd = 'avdmanager -s list avds';
  const execResult = cp.execSync(cmd).toString();
  const header = 'Available Android Virtual Devices:';
  const idx = execResult.indexOf(header);
  // console.log(execResult.substr(idx + header.length + 1));

  for (const device of execResult.substr(idx + header.length).split('---------').map((deviceStr) => parseAndroidDevice(deviceStr))) {
    output.push({
      udid: device.name,
      os: device.target.basedOn,
      name: `${device.device} (${device.target.basedOn})`,
    });
  }

  return output;
}
console.log(listAndroidEmulators());

function parseAndroidDevice(deviceStr: string) {
  const nameKey = 'Name:';
  const deviceKey = 'Device:';
  const pathKey = 'Path:';
  const targetKey = 'Target:';
  const skinKey = 'Skin:';
  const sdcardKey = 'Sdcard:';

  const nameIdx = deviceStr.indexOf(nameKey);
  const deviceIdx = deviceStr.indexOf(deviceKey);
  const pathIdx = deviceStr.indexOf(pathKey);
  const targetIdx = deviceStr.indexOf(targetKey);
  const skinIdx = deviceStr.indexOf(skinKey);
  const sdcardIdx = deviceStr.indexOf(sdcardKey);

  if ([nameIdx, deviceIdx, targetIdx, skinIdx, sdcardIdx].some(v => v === -1)) {
    throw new Error('Invalid device data');
  }

  function getBetween(key: string, startIdx: number, endIdx: number) {
    return deviceStr.substr(startIdx + key.length + 1, endIdx - startIdx - key.length - 1).trim();
  }

  const targetStr = getBetween(targetKey, targetIdx, skinIdx);
  return {
    device: getBetween(deviceKey, deviceIdx, pathIdx),
    name: getBetween(nameKey, nameIdx, deviceIdx),
    path: getBetween(pathKey, pathIdx, targetIdx),
    sdcard: getBetween(sdcardKey, sdcardIdx, deviceStr.length),
    skin: getBetween(skinKey, skinIdx, sdcardIdx),
    target: {
      abi: targetStr.match(/Tag\/ABI: (.*)/)[1].trim(),
      basedOn: targetStr.match(/Based on: (.*) Tag\/ABI:/)[1].trim(),
      isGoogleApi: targetStr.indexOf('Google APIs') !== -1,
    },
  };
}
