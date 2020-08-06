import { Command, flags } from '@oclif/command';
import { cli } from 'cli-ux';
import * as inquirer from 'inquirer';
import 'colors';
import { exec as execCallback } from 'child_process';
import * as util from 'util';
import * as fs from 'fs';

import { setup } from './setup';
import { oneskySetup } from './onesky';
import { REPO_DIRECTORY } from './constants';
import { clearIosBuild, clearIosPods, clearAndroidBuild } from './utils';

const exec = util.promisify(execCallback);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

type Mode =
  | 'ios'
  | 'android'
  | 'setup'
  | 'oneskySetup'
  | 'clearIosBuild'
  | 'clearIosPods'
  | 'clearAndroidBuild'
  | 'exit';
type ApiEnv = 'staging' | 'production';

class MhQaCli extends Command {
  static description = 'Run the MissionHub React Native app for QA';

  static flags = {
    version: flags.version({ char: 'v' }),
    help: flags.help({ char: 'h' }),
  };

  static args = [
    {
      name: 'mode',
      description:
        'Action to perform. One of: iOS, android, setup, oneskySetup, exit',
    },
    { name: 'branch', description: 'Git branch to build' },
    {
      name: 'apiEnv',
      description:
        'API environment to test against. One of: staging, production',
    },
    {
      name: 'simulator',
      description: 'iOS simulator to use',
    },
  ];

  async run() {
    const {
      args,
    }: {
      args: { mode: Mode; branch: string; apiEnv: ApiEnv; simulator: string };
    } = this.parse(MhQaCli);
    console.log(
      '🌤️  MissionHub QA CLI  ⛰'.cyan,
      `  v${this.config.version}`.magenta,
    );

    const {
      mode,
    }: {
      mode: Mode;
    } = args.mode
      ? { mode: args.mode }
      : await inquirer.prompt([
          {
            type: 'list',
            name: 'mode',
            message: 'What would you like to do?'.yellow,
            choices: [
              { name: '🍏  Run iOS Simulator', value: 'ios' },
              { name: '🤖  Run Android emulator', value: 'android' },
              new inquirer.Separator(),
              { name: '🛠️  Setup dev tools', value: 'setup' },
              { name: '🌌  Setup OneSky keys', value: 'oneskySetup' },
              new inquirer.Separator(),
              {
                name: '🗑️🍏🏺  Remove iOS build artifacts',
                value: 'clearIosBuild',
              },
              {
                name: '🗑️🍏🥜  Remove installed iOS Pods',
                value: 'clearIosPods',
              },
              {
                name: '🗑️🤖🏺  Remove Android build artifacts',
                value: 'clearAndroidBuild',
              },
              new inquirer.Separator(),
              { name: '❌  Exit', value: 'exit' },
              new inquirer.Separator(),
            ],
          },
        ]);

    switch (mode) {
      case 'ios': {
        const branch = await promptForCommonArgs(args.branch, args.apiEnv);
        const simulator = args.simulator || (await pickIosSimulator());
        await prepareForBuild(branch);
        await pods();
        await launchIos(simulator);
        return;
      }
      case 'android': {
        const branch = await promptForCommonArgs(args.branch, args.apiEnv);
        await prepareForBuild(branch);
        await launchAndroid();
        return;
      }
      case 'setup':
        return await setup();
      case 'oneskySetup':
        return await oneskySetup();
      case 'clearIosBuild':
        return await clearIosBuild();
      case 'clearIosPods':
        return await clearIosPods();
      case 'clearAndroidBuild':
        return await clearAndroidBuild();
      case 'exit':
        return;
    }
  }
}

const promptForCommonArgs = async (argBranch: string, apiEnv: ApiEnv) => {
  const branch = argBranch || (await askForBranch());
  await setApiEnv(apiEnv);
  return branch;
};

const prepareForBuild = async (branch: string) => {
  await checkoutBranch(branch);
  await yarn();
  await oneskyDownload();
  await gqlSchemaDownload();
};

async function askForBranch() {
  const { branch }: { branch: string } = await inquirer.prompt([
    {
      type: 'list',
      name: 'branch',
      message: 'Which branch would you like to QA?'.yellow,
      choices: await fetchBranches(),
    },
  ]);
  return branch;
}

async function fetchBranches() {
  cli.action.start('👀  Fetching branches');

  const { stdout } = await exec(
    `cd ${REPO_DIRECTORY} && git ls-remote -q --heads | awk '{print $2}'`,
  );

  const sortPriority = (branch: string) =>
    branch === 'develop'
      ? 3
      : branch === 'master'
      ? 2
      : branch.match(/^MHP-/i)
      ? 1
      : 0;

  const branches = stdout
    .split('\n')
    .filter(Boolean)
    .map(branch => branch.trim().replace('refs/heads/', ''))
    .sort(
      (a, b) =>
        sortPriority(b) - sortPriority(a) ||
        a.localeCompare(b, undefined, { sensitivity: 'base' }),
    );

  cli.action.stop();

  return branches;
}

const setApiEnv = async (apiEnvArg: ApiEnv) => {
  const { apiEnv }: { apiEnv: ApiEnv } = apiEnvArg
    ? { apiEnv: apiEnvArg }
    : await inquirer.prompt([
        {
          type: 'list',
          name: 'apiEnv',
          message: 'Which API environment would you like to test against?'
            .yellow,
          choices: ['staging', 'production'],
        },
      ]);

  const apiUri =
    apiEnv === 'production'
      ? 'https://api.missionhub.com'
      : 'https://api-stage.missionhub.com';

  const envFilePath = `${process.env.HOME}/code/missionhub-react-native/.env`;

  const envContents = await readFile(envFilePath, 'utf8');
  await writeFile(
    envFilePath,
    envContents.replace(/API_BASE_URL=.*\n/, `API_BASE_URL=${apiUri}\n`),
  );
};

const pickIosSimulator = async () => {
  const devicesObj: {
    devices: {
      [key: string]: {
        state: string;
        isAvailable: boolean;
        name: string;
        udid: string;
      }[];
    };
  } = JSON.parse(
    (await exec('xcrun simctl list devices iPhone available -j')).stdout,
  );

  const simulators = Object.values(devicesObj.devices)
    .flat()
    .map(({ name }) => name);

  const { simulator }: { simulator: string } = await inquirer.prompt([
    {
      type: 'list',
      name: 'simulator',
      message: 'Which iOS simulator would you like to use?'.yellow,
      choices: simulators,
      default: 'iPhone X',
    },
  ]);

  return simulator;
};

async function checkoutBranch(branch: string) {
  cli.action.start('🚛  Checking out branch: ' + branch);
  await exec(`cd ${REPO_DIRECTORY} && git fetch origin ${branch}`);
  await exec(`cd ${REPO_DIRECTORY} && git checkout -f origin/${branch}`);
  cli.action.stop();
}

async function yarn() {
  cli.action.start('🧶  Installing JS dependencies');
  await exec(`cd ${REPO_DIRECTORY} && yarn`);
  cli.action.stop();
}

async function oneskyDownload() {
  cli.action.start('💬  Downloading translations from OneSky');
  try {
    await exec(`cd ${REPO_DIRECTORY} && yarn onesky:download`);
  } catch {
    console.log(
      "⚠️  Warning: Translations not downloaded. Make sure you've configured OneSky API Keys. Continuing..."
        .yellow,
    );
  }
  cli.action.stop();
}

async function gqlSchemaDownload() {
  cli.action.start('📈  Downloading GraphQL Schema');
  await exec(`cd ${REPO_DIRECTORY} && yarn gql:schema && yarn gql:codegen`);
  cli.action.stop();
}

async function pods() {
  cli.action.start('💎  Installing gems');
  await exec(`cd ${REPO_DIRECTORY}/ios && bundle install`);
  cli.action.stop();

  cli.action.start('📦  Installing iOS pods');
  await exec(`cd ${REPO_DIRECTORY}/ios && pod install --repo-update`);
  cli.action.stop();
}

async function launchIos(simulator: string) {
  cli.action.start('📲  Building and launching on iOS simulator');
  try {
    await exec(
      `cd ${REPO_DIRECTORY} && yarn ios --configuration Release --simulator="${simulator}"`,
    );
  } catch (e) {
    console.error(e.stdout.red);
  }
  cli.action.stop();
}

async function launchAndroid() {
  cli.action.start('📲  Building and launching on Android emulator');
  exec('~/Library/Android/sdk/emulator/emulator -avd missionhub-qa-cli &');
  try {
    await exec(
      `cd ${REPO_DIRECTORY} && ANDROID_SDK_ROOT=${process.env.HOME}/Library/Android/sdk yarn android`,
    );
  } catch (e) {
    console.error(e.stdout.red);
  }
  cli.action.stop();
}

export = MhQaCli;
