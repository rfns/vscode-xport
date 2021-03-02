const getMaximumRange = (range: number, count: number) => count > range ? range : count

const refreshLimit = (count: number, maxRange: number, previousLimit: number = 0) =>
  (previousLimit + maxRange) > count ? count : (previousLimit + maxRange)

const getCompletionRatio = (count: number, limit: number) => Math.floor((100 * limit) / count)

interface PaginationData {
  range: number
  offset: number
  completion: number
  step: number
  limit: number
  page?: number
  stop(): void
}

export async function paginate (
  count: number,
  range: number,
  next: (pagination: PaginationData) => Promise<void>
) {
  let completion = 0
  let limit = 0
  let offset = 0
  let requestedToStop = false
  let page = 1

  const maxRange = getMaximumRange(range, count)
  const stop = () => { requestedToStop = true }

  while (limit < count) {
    if (requestedToStop) return

    const previousRatio = completion
    completion = getCompletionRatio(count, limit)
    const step = completion - previousRatio
    const range = maxRange

    limit = refreshLimit(count, maxRange, limit)

    await next({ range, offset, step, completion, limit, stop, page })
    offset = offset + maxRange
    page += 1
  }
}
