import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as tc from '@actions/tool-cache'
import * as octokit from '@octokit/core'
import {currentTarget} from './utils'

async function run(): Promise<void> {
  try {
    const token: string = core.getInput('repo_token')
    let prebuiltVersion: string = core.getInput('version')
    let prebuiltTarget: string = core.getInput('target')
    const prebuiltOverride: string = core.getInput('always-install')

    if (prebuiltOverride !== 'true') {
      const globber = await glob.create('~/.cargo/bin/cargo-prebuilt')
      const files = await globber.glob()
      if (files.length > 0) return
    }

    if (prebuiltVersion === 'latest') {
      const kit = new octokit.Octokit({
        auth: token
      })
      const info = await kit.request(
        'GET /repos/{owner}/{repo}/releases/latest',
        {
          owner: 'crow-rest',
          repo: 'cargo-prebuilt',
          headers: {
            'X-GitHub-Api-Version': '2022-11-28'
          }
        }
      )

      prebuiltVersion = info.data.tag_name.substring(1)
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
      const prebuiltPath = await tc.downloadTool(
        `https://github.com/crow-rest/cargo-prebuilt/releases/download/v${prebuiltVersion}/${prebuiltTarget}${fileEnding}`
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
