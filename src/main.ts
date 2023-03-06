import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as tc from '@actions/tool-cache'
import * as httpm from '@actions/http-client'
// import * as exec from '@actions/exec'
import {currentTarget} from './utils'

async function run(): Promise<void> {
  try {
    const prebuiltVersion: string = core.getInput('version')
    let prebuiltTarget: string = core.getInput('target')
    const prebuiltOverride: string = core.getInput('always-install')
    const prebuiltTools: string = core.getInput('tools')
    const prebuiltToolsTarget: string = core.getInput('tools-target')

    const client = new httpm.HttpClient()

    if (prebuiltOverride.toLowerCase() !== 'true') {
      const globber = await glob.create('~/.cargo/bin/cargo-prebuilt')
      const files = await globber.glob()
      if (files.length > 0) return
    }
    if (prebuiltTarget === 'current') {
      prebuiltTarget = await currentTarget()
    }

    core.setOutput('version', prebuiltVersion)
    core.setOutput('target', prebuiltTarget)

    const fileEnding: string = prebuiltTarget.includes('windows')
      ? '.zip'
      : '.tar.gz'
    // const exeEnding: string = prebuiltTarget.includes('windows') ? '.exe' : ''

    let directory = tc.find('cargo-prebuilt', prebuiltVersion, prebuiltTarget)
    core.debug(`Found cargo-prebuilt tool cache at ${directory}`)
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
        directory = cachedPath
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
        directory = cachedPath
      }
    }

    // Handle tool downloads
    if (prebuiltTools !== '') {
      const tools = prebuiltTools.split(',')
      let target = prebuiltTarget
      if (prebuiltToolsTarget !== '') target = prebuiltToolsTarget

      for (const tool of tools) {
        const s = tool.split('@')

        let version
        if (s.length > 1) {
          version = s[1]
        } else {
          const res = await client.get(
            `https://github.com/crow-rest/cargo-prebuilt-index/releases/download/stable-index/${s[0]}`
          )
          if (res.message.statusCode === 200) {
            version = await res.readBody()
          } else {
            throw new Error(
              `Could not get latest version of ${s[0]} from cargo-prebuilt-index`
            )
          }
        }

        const file = tc.find(s[0], version, target)
        core.debug(`Found cargo-prebuilt tool cache at ${file}`)
        // core.addPath(file)

        if (directory === '') {
          const toolPath = await tc.downloadTool(
            `https://github.com/crow-rest/cargo-prebuilt-index/releases/download/${s[0]}-${version}/${target}.tar.gz`
          )
          const toolExtracted = await tc.extractTar(toolPath, '~/.cargo/bin')
          await tc.cacheDir(toolExtracted, s[0], version, target)
        }
      }
    }
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
