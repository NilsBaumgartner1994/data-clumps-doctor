# GitHub Copilot Instructions

## Package manager

**Always use `yarn` instead of `npm`.** This repository uses yarn (a `yarn.lock` file is present). Never run `npm install`, `npm ci`, or any other `npm` command that modifies or creates lock files. Use the yarn equivalents:

| Instead of | Use |
|---|---|
| `npm install` | `yarn install` |
| `npm install <pkg>` | `yarn add <pkg>` |
| `npm install -g <pkg>` | `yarn global add <pkg>` |
| `npm ci` | `yarn install --immutable` |
| `npm run <script>` | `yarn <script>` |
| `npm test` | `yarn test` |
| `npm run build` | `yarn build` |

Do **not** create or commit a `package-lock.json` file. The authoritative lock file is `yarn.lock`.

## Refactoring Data Clumps

When refactoring data clumps, follow the strategies described in [REFACTORING_DATA_CLUMPS.md](../REFACTORING_DATA_CLUMPS.md).
