import fs from 'fs-extra'
import shell from 'shelljs'

export function deleteFolder(filePath: string) {
  if (fs.existsSync(filePath)) {
    const files = fs.readdirSync(filePath)
    files.forEach((file) => {
      const nextFilePath = `${filePath}/${file}`
      shell.exec(`rm -rf ${nextFilePath}`)
    })
  }
}
