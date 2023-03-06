import {expect, test} from '@jest/globals'
import * as exec from '@actions/exec'

test('throws invalid number', async () => {
  const input = parseInt('foo', 10)
})

test('get tag', async () => {
  const out = await exec.getExecOutput(
    'git ls-remote --tags --refs https://github.com/crow-rest/cargo-prebuilt.git'
  )

  const re = /([0-9]\.[0-9]\.[0.9])/g
  const tmp = [...out.stdout.matchAll(re)].map(a => {
    return a[0]
  })

  const latest = tmp.sort((a, b) => {
    if (a === b) return 0
    const as = a.split('.')
    const bs = b.split('.')
    if (
      as[0] > bs[0] ||
      (as[0] === bs[0] && as[1] > bs[1]) ||
      (as[0] === bs[0] && as[1] === bs[1] && as[2] > bs[2])
    )
      return 1
    return -1
  })
  console.log(latest[latest.length - 1])
})
