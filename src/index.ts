import { Client, utils } from '@mimic-behavior/ssh2'
import fs from 'node:fs'
import path from 'node:path'

import * as sftpUtils from './utils'

class SftpClient extends Client {
    async mkdir(remotePath: string, options: { recursive?: boolean } = {}): Promise<void> {
        const normalizedPath = path.posix.normalize(remotePath)

        if (normalizedPath === '.' || normalizedPath === '/') {
            throw new Error(`Invalid remote path: ${normalizedPath}`)
        }

        if (!options.recursive) {
            return super.mkdir(normalizedPath)
        }

        let currentPath = path.posix.isAbsolute(normalizedPath) ? '/' : ''

        for (const part of normalizedPath.split('/').filter(Boolean)) {
            currentPath = path.posix.join(currentPath, part)

            const result = await sftpUtils.attempt(() => super.mkdir(currentPath))

            if (sftpUtils.isSftpError(result) && result.code === utils.sftp.STATUS_CODE.FAILURE) {
                const stats = await sftpUtils.attempt(() => super.stat(currentPath))

                if (stats instanceof Error) {
                    throw stats
                }

                if (stats.isDirectory() === false) {
                    throw new Error(`Path exists and is not a directory: ${currentPath}`)
                }

                continue
            }

            if (result instanceof Error) {
                throw result
            }
        }
    }

    async put(localPath: string, remotePath: string): Promise<void> {
        const normalizedPath = path.posix.normalize(remotePath)

        if (normalizedPath === '.' || normalizedPath === '/') {
            throw new Error(`Invalid remote path: ${normalizedPath}`)
        }

        const stats = await sftpUtils.attempt(() => fs.promises.stat(localPath))

        if (stats instanceof Error) {
            throw stats
        }

        if (stats && stats.isDirectory()) {
            throw new Error('Local path is a directory')
        }

        const rStream = fs.createReadStream(localPath)
        const wStream = await super.createWriteStream(normalizedPath)

        return new Promise((resolve, reject) => {
            function onError(err: Error) {
                rStream.destroy()
                wStream.destroy()
                reject(err)
            }

            rStream.on('error', onError)
            wStream.on('error', onError)
            wStream.once('close', resolve)
            rStream.pipe(wStream)
        })
    }
}

export { SftpClient, sftpUtils }

export default SftpClient
