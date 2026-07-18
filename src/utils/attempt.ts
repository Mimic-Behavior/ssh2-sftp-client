function attempt<T, A extends unknown[]>(fn: (...args: A) => Promise<T>, ...args: A) {
    return Promise.try(fn, ...args).catch((err: Error) => err)
}

export { attempt }
