# Contributing to NativeScript Plugin Seed

:+1: First of all, thank you for taking the time to contribute! :+1:

Here are some guides on how to do that:

<!-- TOC depthFrom:2 -->

- [Code of Conduct](#code-of-conduct)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)
- [Submitting a PR](#submitting-a-pr)
- [Where to Start](#where-to-start)

<!-- /TOC -->

##  Code of Conduct
Help us keep a healthy and open community. We expect all participants in this project to adhere to the [NativeScript Code Of Conduct](https://github.com/NativeScript/codeofconduct).


## Reporting Bugs

1. Always update to the most recent master release; the bug may already be resolved.
2. Search for similar issues in the issues list for this repo; it may already be an identified problem.
3. If this is a bug or problem that is clear, simple, and is unlikely to require any discussion -- it is OK to open an issue on GitHub with a reproduction of the bug including workflows and screenshots. If possible, submit a Pull Request with a failing test, entire application or module. If you'd rather take matters into your own hands, fix the bug yourself (jump down to the [Submitting a PR](#submitting-a-pr) section).

## Requesting Features

1. Use Github Issues to submit feature requests.
2. First, search for a similar request and extend it if applicable. This way it would be easier for the community to track the features.
3. When requesting a new feature, please provide as much detail as possible about why you need the feature in your apps. We prefer that you explain a need rather than explain a technical solution for it. That might trigger a nice conversation on finding the best and broadest technical solution to a specific need.

## Submitting a PR

Before you begin:
* Make sure there is an issue for the bug or feature you will be working on.

Following these steps is the best way to get your code included in the project:

1. Fork and clone the nativescript-plugin-seed repo:
```bash
git clone https://github.com/<your-git-username>/nativescript-plugin-seed.git
# Navigate to the newly cloned directory
cd nativescript-plugin-seed
# Add an "upstream" remote pointing to the original repo.
git remote add upstream https://github.com/NativeScript/nativescript-plugin-seed.git
```
2. Create a branch for your PR
```bash
git checkout -b <my-fix-branch> master
```

3. The fun part! Make your code changes. Make sure you:
    - Follow the [code conventions guide](https://github.com/NativeScript/NativeScript/blob/master/CodingConvention.md).
    - Follow the [commit message guidelines](https://github.com/NativeScript/NativeScript/blob/pr-template/CONTRIBUTING.md#commit-messages)
    - Setup your development workflow. The seed itself is a plugin so you can follow the [development setup][https://github.com/NativeScript/nativescript-plugin-seed#development-setup] described in the README.
    - Write unit tests for your fix or feature. If this is not possible, explain how your change can be tested.
        > NOTE: For changes in the postclone step, make sure you create tests in `seed-tests/postclone.tests.js`!

4. Before you submit your PR:
    - Rebase your changes to the latest master: `git pull --rebase upstream master`.
    - Ensure all unit test are green. How?
         - Go to `seed-tests`
         - Run `npm install`
         - Run `npm run test.ios` or `npm run test.android`
    - Ensure your changes pass tslint validation. (run `npm run tslint` in the root of the repo).

6. Push your fork. If you have rebased you might have to use force-push your branch:
```
git push origin <my-fix-branch> --force
```

7. [Submit your pull request](https://github.com/NativeScript/nativescript-plugin-seed/compare) and compare to `NativeScript/nativescript-plugin-seed`. Please, fill in the Pull Request template - it will help us better understand the PR and increase the chances of it getting merged quickly.

It's our turn from there on! We will review the PR and discuss changes you might have to make before merging it! Thanks! 

## Where to Start

If you want to contribute, but you are not sure where to start - look for issues labeled [`help wanted`](https://github.com/NativeScript/nativescript-plugin-seed/issues?q=is%3Aopen+is%3Aissue+label%3A%22help+wanted%22).
