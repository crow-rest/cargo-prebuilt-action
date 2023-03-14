import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'
import * as httpm from '@actions/http-client'
import * as exec from '@actions/exec'
import * as io from '@actions/io'
import {currentTarget} from './utils'

async function run(): Promise<void> {
  try {
    let prebuiltVersion: string = core.getInput('version')
    let fallbackVersion: string | undefined
    let prebuiltTarget: string = core.getInput('target')
    const prebuiltOverride: string = core.getInput('always-install')
    const prebuiltTools: string = core.getInput('tools')
    const prebuiltToolsTarget: string = core.getInput('tools-target')

    const client = new httpm.HttpClient()

    if (prebuiltOverride.toLowerCase() !== 'true') {
      const which = await io.which('cargo-prebuilt', true)
      if (which !== '') return
    }
    if (prebuiltVersion === 'latest') {
      const out = await exec.getExecOutput(
        'git ls-remote --tags --refs https://github.com/crow-rest/cargo-prebuilt.git'
      )

      const re = /([0-9]\.[0-9]\.[0-9])/g
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
      prebuiltVersion = latest[latest.length - 1]
      fallbackVersion = latest[latest.length - 2]
      core.info(
        `Picked cargo-prebuilt version ${prebuiltVersion} with fallback version ${fallbackVersion}`
      )
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
    core.debug(`Found cargo-prebuilt tool cache at ${directory}`)
    core.addPath(directory)

    if (directory === '') {
      let prebuiltPath
      try {
        prebuiltPath = await tc.downloadTool(
          `https://github.com/crow-rest/cargo-prebuilt/releases/download/v${prebuiltVersion}/${prebuiltTarget}${fileEnding}`
        )
      } catch {
        core.info('Failed to install main version using fallback version')
        if (fallbackVersion)
          prebuiltPath = await tc.downloadTool(
            `https://github.com/crow-rest/cargo-prebuilt/releases/download/v${fallbackVersion}/${prebuiltTarget}${fileEnding}`
          )
        else throw new Error('Could not install cargo-prebuilt')
      }

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
      core.info('Installed cargo-prebuilt')
    }

    // Handle tool downloads
    let installedTools = ''
    if (prebuiltTools !== '') {
      const tools = prebuiltTools.split(',')
      let target = prebuiltTarget
      if (prebuiltToolsTarget === 'current') {
        target = prebuiltTarget
      } else {
        target = prebuiltToolsTarget
      }

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
        if (toolDir === '') {
          let tDir
          try {
            tDir = await tc.downloadTool(
              `https://github.com/crow-rest/cargo-prebuilt-index/releases/download/${s[0]}-${version}/${target}.tar.gz`
            )
          } catch {
            throw new Error(`Could not install ${s[0]}@${version}`)
          }

          tDir = await tc.extractTar(
            tDir,
            `~/.cargo-prebuilt/${s[0]}-${version}`
          )

          const cachedPath = await tc.cacheDir(tDir, s[0], version, target)

          core.addPath(cachedPath)
          installedTools += `${s[0]}@${version}`
          core.info(`Installed ${s[0]} ${version}`)
        } else {
          core.debug(`Found ${s[0]} tool cache at ${toolDir}`)
          installedTools += `${s[0]}@${version}`
          core.addPath(toolDir)
        }
      }
    }

    core.setOutput('tools-installed', installedTools)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
