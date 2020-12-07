import path from 'path'
import fs from 'fs-extra'
import inquirer from 'inquirer'
import chalk from 'chalk'
import shell from 'shelljs'
import { IConfig, IOptions, IData } from './types'
import { deleteFolder } from './utils'

export default async (name: string | undefined, options: IOptions) => {
  const cwd = process.cwd()
  const inCurrent = !name || name === '.'
  const currentName = inCurrent ? path.relative('./', cwd) : name
  const targetDir = path.resolve(cwd, currentName || '.')

  const { force } = options

  if (force) {
    deleteFolder(targetDir)
  }

  if (fs.existsSync(targetDir) && !force) {
    if (inCurrent) {
      const { ok } = await inquirer.prompt([
        {
          name: 'ok',
          type: 'confirm',
          message: `Whether to create the project in the current ${chalk.cyan(
            targetDir
          )} folder or no？`,
        },
      ])
      if (!ok) {
        process.exit(1)
      }
    } else {
      const { action } = await inquirer.prompt([
        {
          name: 'action',
          type: 'list',
          message: `The current folder ${chalk.cyan(
            targetDir
          )} already exists, whether to overwrite the overwrite?`,
          choices: [
            { name: 'confirm', value: true },
            { name: 'cancel', value: false },
          ],
        },
      ])
      if (action) {
        await fs.remove(targetDir)
      } else {
        process.exit(1)
      }
    }
  }

  const { choose } = await getConfig()
  const deps: string[] = []
  const packageJsonData: IData = {}

  shell.exec('npm init -y', { cwd: targetDir })
  await setTypescriptConfig(targetDir, deps)
  await setCommitlintConfig(choose, targetDir, deps, packageJsonData)
  await setLintConfig(choose, targetDir, deps, packageJsonData)
  await setJestConfig(choose, targetDir, deps)
  await setLernaConfig(choose, deps)
  await setPackageJsonFile(choose, targetDir, deps, packageJsonData)
}

const getConfig = () => {
  return inquirer.prompt<{ choose: IConfig[] }>([
    {
      name: 'choose',
      type: 'checkbox',
      message: '',
      choices: [
        { name: 'ESLint / Prettier', value: IConfig['ESLint / Prettier'] },
        { name: 'Jest', value: IConfig.Jest },
        { name: 'Commitlint', value: IConfig.Commitlint },
        { name: 'Lerna', value: IConfig.Lerna },
      ],
    },
  ])
}

const setLintConfig = async (
  choose: IConfig[],
  targetDir: string,
  deps: string[],
  packageJsonData: IData
) => {
  if (choose.includes(IConfig['ESLint / Prettier'])) {
    fs.writeJSONSync(
      `${targetDir}/.prettierrc.json`,
      {
        trailingComma: 'es5',
        tabWidth: 2,
        semi: false,
        singleQuote: true,
      },
      { spaces: 2 }
    )
    const eslintData = {
      root: true,
      env: {
        node: true,
      },
      extends: ['eslint:recommended'],
      parserOptions: {
        ecmaVersion: 2020,
      },
      rules: {
        'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
        'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      },
    }
    if (choose.includes(IConfig.Jest)) {
      // @ts-ignore
      eslintData.env.jest = true
    }
    packageJsonData['husky'] = {
      ...packageJsonData['husky'],
      hooks: {
        'pre-commit': 'lint-staged',
      },
    }
    packageJsonData['lint-staged'] = {
      '*.{js,json,md,tsx,ts}': ['prettier --write', 'git add'],
    }
    await fs.writeFile(
      `${targetDir}/.eslintrc.js`,
      `module.exports = ${JSON.stringify(eslintData, null, 2)}`
    )
    await fs.writeFile(`${targetDir}/.prettierignore`, 'dist')
    deps.push(
      ...['eslint', 'eslint-plugin-prettier', 'lint-staged', 'prettier']
    )
  }
}

const setTypescriptConfig = async (targetDir: string, deps: string[]) => {
  const filePath = `${targetDir}/tsconfig.json`
  await fs.writeJSON(
    filePath,
    {
      compilerOptions: {
        target: 'es5',
        module: 'commonjs',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        baseUrl: '.',
        noUnusedLocals: true,
        noUnusedParameters: true,
        noFallthroughCasesInSwitch: true,
        outDir: './dist',
      },
    },
    { spaces: 2 }
  )
  deps.push('typescript')
}

const setJestConfig = async (
  choose: IConfig[],
  targetDir: string,
  deps: string[]
) => {
  if (choose.includes(IConfig.Jest)) {
    const jestData = {
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['**/__tests__/**/*.test.ts?(x)'],
      testPathIgnorePatterns: [
        '<rootDir>/dist/',
        '<rootDir>/node_modules/',
        '(.*).d.ts',
      ],
    }
    await fs.writeFile(
      `${targetDir}/jest.config.js`,
      `module.exports = ${JSON.stringify(jestData, null, 2)}`
    )
    deps.push(...['jest', 'ts-jest', '@types/jest'])
  }
}

const setCommitlintConfig = async (
  choose: IConfig[],
  targetDir: string,
  deps: string[],
  packageJsonData: IData
) => {
  if (choose.includes(IConfig.Commitlint)) {
    const lintData = { extends: ['@commitlint/config-conventional'] }
    await fs.writeFile(
      `${targetDir}/commitlint.config.js`,
      `module.exports = ${JSON.stringify(lintData, null, 2)}`
    )
    packageJsonData['husky'] = {
      ...packageJsonData['husky'],
      hooks: {
        'commit-msg': 'commitlint -E HUSKY_GIT_PARAMS',
      },
    }
    deps.push(
      ...['@commitlint/cli', '@commitlint/config-conventional', 'husky']
    )
  }
}

const setLernaConfig = async (choose: IConfig[], deps: string[]) => {
  if (choose.includes(IConfig.Lerna)) {
    deps.push(...['lerna'])
  }
}

const setPackageJsonFile = async (
  choose: IConfig[],
  targetDir: string,
  deps: string[],
  packageJsonData: IData
) => {
  console.log(chalk.cyan('Start Installing Dependencies'))
  shell.exec(`yarn add -D ${deps.join(' ')}`, { cwd: targetDir })
  if (choose.includes(IConfig.Lerna)) {
    shell.exec('npx lerna init', { cwd: targetDir })
  }
  const filePath = `${targetDir}/package.json`
  const json = await fs.readJSON(filePath)
  const data: IData = {
    test: 'jest',
    clean: 'rm -rf ./dist',
    build: 'yarn clean && tsc',
    prepare: 'yarn build',
    'check-types': 'tsc --noEmit',
  }
  if (choose.includes(IConfig['ESLint / Prettier'])) {
    data['check-formatting'] = "prettier --check '**/*.{js,json,md,tsx,ts}'"
  }
  json['scripts'] = data
  await fs.writeJSON(filePath, { ...json, ...packageJsonData }, { spaces: 2 })
}
