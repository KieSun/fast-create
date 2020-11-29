import path from 'path'
import fs from 'fs-extra'
import inquirer from 'inquirer'
import chalk from 'chalk'
import { IOptions } from './types'

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
}

const getConfig = async () => {
  return inquirer.prompt([
    {
      name: 'choose',
      type: 'checkbox',
      message: '',
      choices: [
        { name: 'ESLint', value: 0 },
        { name: 'Prettier', value: 1 },
        { name: 'Jest', value: 2 },
        { name: 'Commitlint', value: 3 },
        { name: 'Lerna', value: 4 },
      ],
    },
  ])
}
