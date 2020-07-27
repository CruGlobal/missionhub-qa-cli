# mh-qa-cli

A command to get MissionHub QA running

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/mh-qa-cli.svg)](https://npmjs.org/package/mh-qa-cli)
[![Downloads/week](https://img.shields.io/npm/dw/mh-qa-cli.svg)](https://npmjs.org/package/mh-qa-cli)
[![License](https://img.shields.io/npm/l/mh-qa-cli.svg)](https://github.com/CruGlobal/mh-qa-cli/blob/master/package.json)

# Setup

1. Install homebrew https://brew.sh/#install
2. Update ruby version\
   Install asdf https://asdf-vm.com/#/core-manage-asdf-vm?id=install (use macOS and Homebrew instructions unless you're on a different environment)\
   `asdf plugin add ruby`\
   `asdf install ruby latest`\
   `(cd ~/code/missionhub-react-native && asdf local ruby latest)` (may have to replace `latest` with version returned by previous command)
3. Install yarn\
   `brew install yarn`
4. Install mh-qa-cli\
   `yarn global add mh-qa-cli`
   
   For updates, run again with the version to upgrade to. Example: `yarn global add mh-qa-cli@0.3.3`

# Usage

Run `mh-qa-cli` and select what you would like to do.\
If running for the first time choose `🛠️ Setup dev tools`to install dependencies.

To add translation support choose `🌌 Setup OneSky keys`.

# Commands

`mh-qa-cli` can be run with arguments instead of being prompted with questions. Any omitted arguments will still result in prompts.

## iOS

`mh-qa-cli ios <branch> <staging|production> <simulator name>`

Example:\
`mh-qa-cli ios master production "iPhone 8"`

## Android

`mh-qa-cli android <branch> <staging|production>`

Example:\
`mh-qa-cli android master production`
