import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as tc from '@actions/tool-cache'
import * as httpm from '@actions/http-client'
import * as exec from '@actions/exec'
import * as io from '@actions/io'
import {currentTarget} from './utils'

async function run(): Promise<void> {
  try {
    let prebuiltVersion: string = core.getInput('version')
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
    if (prebuiltVersion === 'latest') {
      const out = await exec.getExecOutput(
        'git ls-remote --tags --refs https://github.com/crow-rest/cargo-prebuilt.git'
      )
      const re = /v([0-9]\.[0-9]\.[0.9])/
      const tmp = out.stdout.match(re)
      if (tmp === null)
        throw new Error('Could not get latest version tag for cargo-prebuilt.')

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
      prebuiltVersion = latest[latest.length - 1]
    }
    if (prebuiltTarget === 'current') {
      prebuiltTarget = await currentTarget()
    }

    core.setOutput('version', prebuiltVersion)
    core.setOutput('target', prebuiltTarget)

    const fileEnding: string = prebuiltTarget.includes('windows')
      ? '.zip'
      : '.tar.gz'

    let directory = tc.find('cargo-prebuilt', prebuiltVersion, prebuiltTarget)
    core.debug(`Found cargo-prebuilt tool cache at ${directory}`)
    core.addPath(directory)

    if (directory === '') {
      const prebuiltPath = await tc.downloadTool(
        `https://github.com/crow-rest/cargo-prebuilt/releases/download/v${prebuiltVersion}/${prebuiltTarget}${fileEnding}`
      )

      let prebuiltExtracted
      if (prebuiltTarget.includes('windows')) {
        prebuiltExtracted = await tc.extractZip(
          prebuiltPath,
          '~/.cargo-prebuilt/prebuilt'
        )
      } else {
        prebuiltExtracted = await tc.extractTar(
          prebuiltPath,
          '~/.cargo-prebuilt/prebuilt'
        )
      }

      const cachedPath = await tc.cacheDir(
        prebuiltExtracted,
        'cargo-prebuilt',
        prebuiltVersion,
        prebuiltTarget
      )

      core.addPath(cachedPath)
      directory = cachedPath
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

        version = version.trim()

        const toolDir = tc.find(s[0], version, target)
        core.debug(`Found ${s[0]} tool cache at ${toolDir}`)
        core.addPath(toolDir)

        if (toolDir === '') {
          const dir = `~/.cargo-prebuilt/tools/${s[0]}/${version}`
          await io.mkdirP(dir)
          await exec.exec(
            `${directory}/cargo-prebuilt`,
            ['--no-bin', '--ci', `${s[0]}@${version}`],
            {
              env: {
                CARGO_HOME: dir
              }
            }
          )

          const cachedPath = await tc.cacheDir(dir, s[0], version, target)
          core.addPath(cachedPath)
        }
      }
    }
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
