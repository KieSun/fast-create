export interface IOptions {
  force: boolean
}

export enum IConfig {
  'ESLint / Prettier',
  'Jest',
  'Commitlint',
  'Lerna',
}

export type IData = { [key: string]: any }
