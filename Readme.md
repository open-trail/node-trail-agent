# node-trail-agent [![NPM version][npm-image]][npm-url] [![build status][travis-image]][travis-url] [![Test coverage][coveralls-image]][coveralls-url]

> Distributed tracing agent for Node.js

## Installation

    npm install --save trail-agent

## Usage

## Development

Install global dependencies

    npm install -g commitizen cz-conventional-changelog trash-cli conventional-recommended-bump conventional-changelog-cli conventional-github-releaser conventional-commits-detector json

Setup environment variable `CONVENTIONAL_GITHUB_RELEASER_TOKEN`

Commit changes (provided by commitizen)

    git cz

Publish module

    npm run np

## License

MIT

[npm-image]: https://img.shields.io/npm/v/trail-agent.svg?style=flat
[npm-url]: https://npmjs.org/package/trail-agent
[travis-image]: https://img.shields.io/travis/CatTail/node-trail-agent.svg?style=flat
[travis-url]: https://travis-ci.org/CatTail/node-trail-agent
[coveralls-image]: https://img.shields.io/coveralls/CatTail/node-trail-agent.svg?style=flat
[coveralls-url]: https://coveralls.io/r/CatTail/node-trail-agent?branch=master
