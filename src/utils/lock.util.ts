/**
 * const lock = createAsyncLock();
 *
 * return await lock(async () => {
 *  return await someAsyncFunction();
 * });
 */
export function createAsyncLock() {
  let lock = Promise.resolve()
  return async function <T>(fn: () => Promise<T>): Promise<T> {
    const _lock = lock
    let release = () => {}
    lock = new Promise((resolve) => {
      release = resolve
    })
    try {
      return await _lock.then(fn)
    }
    finally {
      release()
    }
  }
}
