#!/usr/bin/env node
import { program } from 'commander'
import create from './create'

program.version(`fast-create ${require('../package').version}`)

program
  .command('create [name]')
  .description('创建一个新项目')
  .option('-f, --force', '如果文件夹存在就覆盖重写')
  .action((name, options) => {
    create(name, options)
  })

program.parse(process.argv)
