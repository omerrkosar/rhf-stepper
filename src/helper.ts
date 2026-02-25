function buildNestedValues(fields: string[], values: unknown[]): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (let i = 0; i < fields.length; i++) {
    const segments = fields[i].split('.')
    let current: Record<string, unknown> = result
    for (let j = 0; j < segments.length - 1; j++) {
      const segment = segments[j]
      const nextSegment = segments[j + 1]
      const isNextNumeric = /^\d+$/.test(nextSegment)
      if (current[segment] === undefined) {
        current[segment] = isNextNumeric ? [] : {}
      }
      current = current[segment] as Record<string, unknown>
    }
    current[segments[segments.length - 1]] = values[i]
  }
  return result
}

export { buildNestedValues }
