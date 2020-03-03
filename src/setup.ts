import 'colors';
import * as Listr from 'listr';
import * as util from 'util';
import { REPO_DIRECTORY } from './constants';

const exec = util.promisify(require('child_process').exec);

const dependencies: {
  title: string;
  check?: string;
  install: string;
}[] = [
  {
    title: '🍺  Installing brew',
    check: 'command -v brew',
    install:
      '/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"',
  },
  {
    title: '🌵  Installing git',
    check: 'command -v git',
    install: 'brew install git',
  },
  {
    title: '🍫  Installing cocoapods',
    check: 'command -v pod',
    install: 'gem install cocoapods',
  },
  {
    title: '🧶  Installing yarn',
    check: 'command -v yarn',
    install: 'brew install yarn',
  },
  {
    title: '📁  Creating directories',
    check: 'cd ~/code',
    install: 'mkdir ~/code',
  },
  {
    title: '🌀  Cloning repo',
    check: `cd ${REPO_DIRECTORY} && git rev-parse --is-inside-work-tree`,
    install:
      'cd ~/code && git clone https://github.com/CruGlobal/missionhub-react-native.git',
  },
  {
    title: '🏞️  Initializing .env',
    install: `cp ${REPO_DIRECTORY}/.env.staging ${REPO_DIRECTORY}/.env`,
  },
  {
    title: '🤖  Installing android studio',
    check: 'ls /Applications/Android\\ Studio.app/Contents',
    install: 'brew cask install android-studio',
  },
  {
    title: '📱  Creating Android Emulator',
    check: '[ ! -f ~/Library/Android/sdk/tools/bin/avdmanager ]',
    install: `JAVA_HOME=/Applications/Android\\ Studio.app/Contents/jre/jdk/Contents/Home
      ~/Library/Android/sdk/tools/bin/sdkmanager "system-images;android-29;google_apis;x86" &&
      ~/Library/Android/sdk/tools/bin/avdmanager create avd --name missionhub_qa_cli --package "system-images;android-29;google_apis;x86" --device pixel_xl --force &&
      (grep -qF -- "hw.keyboard=yes" ~/.android/avd/missionhub_qa_cli.avd/config.ini || echo "hw.keyboard=yes" >> ~/.android/avd/missionhub_qa_cli.avd/config.ini)`,
  },
];

const setupTasks = new Listr(
  dependencies.map(({ title, check, install }) => ({
    title,
    skip: async () => {
      try {
        await exec(check);
        return true;
      } catch {
        return false;
      }
    },
    task: async () => await exec(install),
  })),
);

export const setup = () => setupTasks.run();
