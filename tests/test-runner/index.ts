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
  const execResult = cp.execSync('xcrun simctl list devices --json').toString();

  const devices = (JSON.parse(execResult) as IOSDeviceList).devices;
  let numAvailable = 0;
  const output = [] as { name: string, os: string, udid: string }[];
  for (const key of Object.keys(devices)) {
    if (key.startsWith('com.') || key.startsWith('tvOS') || key.startsWith('watchOS') || key.endsWith('8.4')) {
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
  console.log(util.inspect(devices, false, 10));
  console.log(numAvailable);

  return output;
}
console.log(listIOSSimulators());