import 'colors';
import * as Listr from 'listr';
import * as util from 'util';

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
    title: '🌀  Cloning repo',
    check:
      'cd ~/code/missionhub-react-native && git rev-parse --is-inside-work-tree',
    install:
      'mkdir ~/code && cd ~/code && git clone https://github.com/CruGlobal/missionhub-react-native.git',
  },
  {
    title: '🏞️  Initializing .env',
    install:
      'cp ~/code/missionhub-react-native/.env.beta ~/code/missionhub-react-native/.env',
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
