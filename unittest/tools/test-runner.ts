import "tslib";

import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

interface IOSEmulatorInfo {
    deviceName: string;
    platform: string;
    version: string;
    deviceId: string;
    imageId: string;
}

async function findIOSEmulators() {
    const { stdout, stderr } = await execPromise(`tns device ios --available-devices`);
    if (stderr) {
        throw new Error(stderr);
    }

    const availableEmulators = "Available emulators";
    const emulatorsIndex = stdout.indexOf(availableEmulators);
    const devicesIndex = stdout.indexOf("Connected devices & emulators");

    const res = [] as IOSEmulatorInfo[];

    for (const line of stdout
        .substring(emulatorsIndex + availableEmulators.length, devicesIndex)
        .split(/\n/)
        .map((v) => v.trim())) {
        if (!line || line.includes("─") || line.includes("Device Name")) {
            continue;
        }

        const row = line.split("│").map((v) => v.trim());
        if (row.length !== 8) {
            continue;
        }
        const [, deviceName, platform, version, deviceId, imageId, errorInfo] = row;
        if (errorInfo) {
            throw new Error(errorInfo);
        }

        res.push({
            deviceName,
            platform,
            version,
            deviceId,
            imageId,
        });
    }

    return res;
}

async function runTestOniOSDevice(emulatorInfo: IOSEmulatorInfo) {
    const { deviceId, deviceName, version } = emulatorInfo;

    const cls = `${deviceName} iOS ${version} (${deviceId})`;
    const start = Date.now();
    console.log(`Running Unit tests on:\n${cls}`);

    const { stdout, stderr } = await execPromise(`tns test ios --device ${deviceId} --justlaunch`);
    if (stderr) {
        console.log(stdout);

        throw new Error(stderr);
    }

    const runTime = Date.now() - start;
    console.log(`Ended after ${runTime / 1000}s`);
}

const wantedDeviceName = "iPhone 6";
async function runTests() {
    const devices = await findIOSEmulators();

    for (const device of devices) {
        if (device.deviceName !== wantedDeviceName) {
            continue;
        }

        await runTestOniOSDevice(device);
    }
}

runTests();
