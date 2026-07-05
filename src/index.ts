import { Client, utils } from '@mimic-behavior/ssh2'
import path from 'path'

import * as sftpUtils from './utils'

class SftpClient extends Client {
    async mkdir(remotePath: string, options: { recursive?: boolean } = {}): Promise<void> {
        const normalizedPath = path.posix.normalize(remotePath)

        if (normalizedPath === '.' || normalizedPath === '/') {
            return
        }

        if (!options.recursive) {
            return super.mkdir(normalizedPath)
        }

        let currentPath = path.posix.isAbsolute(normalizedPath) ? '/' : ''

        for (const part of normalizedPath.split('/').filter(Boolean)) {
            currentPath = path.posix.join(currentPath, part)

            try {
                const stats = await super.stat(currentPath)

                if (!stats.isDirectory()) {
                    throw new Error(`Path exists and is not a directory: ${currentPath}`)
                }
            } catch (err) {
                if (sftpUtils.isSftpError(err) && err.code === utils.sftp.STATUS_CODE.NO_SUCH_FILE) {
                    await super.mkdir(currentPath)
                } else {
                    throw err
                }
            }
        }
    }
}

export { SftpClient, sftpUtils }

export default SftpClient
