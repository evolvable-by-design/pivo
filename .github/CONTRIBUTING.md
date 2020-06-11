:+1::tada: First of all, thanks for taking the time to contribute! :tada::+1:

Pivo is an open source project held under the evolvable-by-design GitHub organization that groups projects to help developers build evolvable-by-design user interfaces.

### [Code of Conduct](https://github.com/evolvable-by-design/pivo/blob/master/.github/CODE_OF_CONDUCT.md)

Pivo has adopted the [Contributor Covenant](https://www.contributor-covenant.org/) as its Code of Conduct, and I expect project participants to adhere to it. Please read [the full text](https://github.com/evolvable-by-design/pivo/blob/master/.github/CODE_OF_CONDUCT.md) so that you can understand what actions will and will not be tolerated.

### Open Development

All work on Pivo happens directly on [GitHub](https://github.com/evolvable-by-design/pivo). Both core team members and external contributors send pull requests which go through the same review process.

### Semantic Versioning

Pivo follows [semantic versioning](https://semver.org/). We release patch versions for critical bugfixes, minor versions for new features or non-essential changes, and major versions for any breaking changes.

### Branch Organization

Submit all changes directly to the [`master branch`](https://github.com/evolvable-by-design/pivo/tree/master). We don't use separate branches for development or for upcoming releases. We do our best to keep `master` in good shape, with all tests passing.

#### Where to Find Known Issues

We are using [GitHub Issues](https://github.com/evolvable-by-design/pivo/issues) for our public bugs. We keep a close eye on this and try to make it clear when we have an internal fix in progress. Before filing a new task, try to make sure your problem doesn't already exist.

#### Reporting New Issues

The best way to get your bug fixed is to provide a reduced test case.

### How to Get in Touch

You can send an email at antoine.cheron[at]fabernovel.com.

### Proposing a Change

If you intend to change the public API, or make any non-trivial changes to the implementation, we recommend [filing an issue](https://github.com/evolvable-by-design/pivo/issues/new). This lets us reach an agreement on your proposal before you put significant effort into it.

If you're only fixing a bug, it's fine to submit a pull request right away but we still recommend to file an issue detailing what you're fixing. This is helpful in case we don't accept that specific fix but want to keep track of the issue.

### Your First Pull Request

Working on your first Pull Request? You can learn how from this free video series:

**[How to Contribute to an Open Source Project on GitHub](https://egghead.io/series/how-to-contribute-to-an-open-source-project-on-github)**

If you decide to fix an issue, please be sure to check the comment thread in case somebody is already working on a fix. If nobody is working on it at the moment, please leave a comment stating that you intend to work on it so other people don't accidentally duplicate your effort.

If somebody claims an issue but doesn't follow up for more than two weeks, it's fine to take it over but you should still leave a comment.

### Sending a Pull Request

The core team is monitoring for pull requests. We will review your pull request and either merge it, request changes to it, or close it with an explanation. We'll do our best to provide updates and feedback throughout the process.

**Before submitting a pull request,** please make sure the following is done:

1. Clone [the repository](https://github.com/evolvable-by-design/pivo) and create your branch from `master`.
2. Run `yarn` in the repository root, then in the package(s) that you will work on and create your branch from `master`.
3. If you've fixed a bug or added code that should be tested, add tests.
4. Ensure the test suite passes (`yarn test`). Tip: `yarn test --watch TestName` is helpful in development.
5. Format your code with [prettier-standard](https://github.com/sheerun/prettier-standard) (`yarn format`).
6. Make sure your code lints (`yarn lint`).

### Contribution Prerequisites

- You have [Node](https://nodejs.org) installed at v8.0.0+ and [Yarn](https://yarnpkg.com/en/) at v1.2.0+.
- You are familiar with Git.

### Development Workflow

After cloning React, run `yarn` to fetch its dependencies.
Then, you can run several commands:

- `yarn lint` checks the code style.
- `yarn test` runs the complete test suite.

We recommend running `yarn test` (or its variations above) to make sure you don't introduce any regressions as you work on your change. However it can be handy to try your changes in a real project. In addition, we can ensure that we don't break your code in the future.

### Style Guide

We use an automatic code formatter called [Prettier](https://prettier.io/).
Run `yarn format` after making any changes to the code.

Then, our linter will catch most issues that may exist in your code.

### License

By contributing to Pivo, you agree that your contributions will be licensed under its ISC license.
