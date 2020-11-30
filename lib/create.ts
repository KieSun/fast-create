import path from 'path'
import fs from 'fs-extra'
import inquirer from 'inquirer'
import chalk from 'chalk'
import { IConfig, IOptions } from './types'

export default async (name: string | undefined, options: IOptions) => {
  const cwd = process.cwd()
  const inCurrent = !name || name === '.'
  const currentName = inCurrent ? path.relative('./', cwd) : name
  const targetDir = path.resolve(cwd, currentName || '.')

  const { force } = options

  if (force) {
    await fs.remove(targetDir)
  }

  if (fs.existsSync(targetDir) && !force) {
    if (inCurrent) {
      const { ok } = await inquirer.prompt([
        {
          name: 'ok',
          type: 'confirm',
          message: `是否在当前 ${chalk.cyan(targetDir)} 文件夹中创建项目？`,
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
          message: `当前文件夹 ${chalk.cyan(targetDir)} 已经存在，是否覆盖重写`,
          choices: [
            { name: '确定', value: true },
            { name: '取消', value: false },
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

  await setLintConfig(choose, targetDir, deps)
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
  deps: string[]
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
