import * as util from 'util';
import { exec as execCallback } from 'child_process';
import { REPO_DIRECTORY } from './constants';

const exec = util.promisify(execCallback);

export const clearIosBuild = async () =>
  await exec(`rm -rf ${REPO_DIRECTORY}/ios/build`);

export const clearIosPods = async () =>
  await exec(`rm -rf ${REPO_DIRECTORY}/ios/Pods`);

export const clearAndroidBuild = async () =>
  await exec(`rm -rf ${REPO_DIRECTORY}/android/app/build`);
