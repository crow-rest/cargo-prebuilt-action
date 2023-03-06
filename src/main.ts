import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as tc from '@actions/tool-cache'
import * as httpm from '@actions/http-client'
import {currentTarget} from './utils'

async function run(): Promise<void> {
  try {
    let prebuiltVersion: string = core.getInput('version')
    let prebuiltTarget: string = core.getInput('target')
    const prebuiltOverride: string = core.getInput('always-install')

    if (prebuiltOverride.toLowerCase() !== 'true') {
      const globber = await glob.create('~/.cargo/bin/cargo-prebuilt')
      const files = await globber.glob()
      if (files.length > 0) return
    }

    if (prebuiltVersion === 'latest') {
      const client = new httpm.HttpClient()
      const res = await client.get(
        'https://github.com/crow-rest/cargo-prebuilt-index/releases/download/stable-index/cargo-prebuilt'
      )

      if (res.message.statusCode === 200) {
        prebuiltVersion = await res.readBody()
      } else {
        throw new Error('Could not get latest version of cargo-prebuilt')
      }
    }

    if (prebuiltTarget === 'current') {
      prebuiltTarget = await currentTarget()
    }

    core.setOutput('version', prebuiltVersion)
    core.setOutput('target', prebuiltTarget)

    const fileEnding: string = prebuiltTarget.includes('windows')
      ? '.zip'
      : '.tar.gz'

    const directory = tc.find('cargo-prebuilt', prebuiltVersion, prebuiltTarget)
    core.debug(directory)
    core.addPath(directory)

    if (directory === '') {
      let v = prebuiltVersion
      if (v !== 'latest') v = `v${v}`

      const prebuiltPath = await tc.downloadTool(
        `https://github.com/crow-rest/cargo-prebuilt/releases/download/${v}/${prebuiltTarget}${fileEnding}`
      )

      if (prebuiltTarget.includes('windows')) {
        const prebuiltExtracted = await tc.extractZip(
          prebuiltPath,
          '~/.cargo-prebuilt'
        )
        const cachedPath = await tc.cacheDir(
          prebuiltExtracted,
          'cargo-prebuilt',
          prebuiltVersion,
          prebuiltTarget
        )
        core.addPath(cachedPath)
      } else {
        const prebuiltExtracted = await tc.extractTar(
          prebuiltPath,
          '~/.cargo-prebuilt'
        )
        const cachedPath = await tc.cacheDir(
          prebuiltExtracted,
          'cargo-prebuilt',
          prebuiltVersion,
          prebuiltTarget
        )
        core.addPath(cachedPath)
      }
    }
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
