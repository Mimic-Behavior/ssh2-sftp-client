import type { utils } from '@mimic-behavior/ssh2'

type SftpError = { code: utils.sftp.STATUS_CODE } & Error

function isSftpError(err: unknown): err is SftpError {
    return err instanceof Error && 'code' in err && typeof err.code === 'number'
}

export { isSftpError }
