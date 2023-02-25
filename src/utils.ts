import {arch, platform} from 'node:process'

export async function currentTarget(): Promise<string> {
  return new Promise(resolve => {
    switch (arch) {
      case 'arm':
        if (platform === 'linux') resolve('armv7-unknown-linux-gnueabihf')
        else throw new Error('unsupported platform')
        break
      case 'arm64':
        if (platform === 'linux') resolve('aarch64-unknown-linux-gnu')
        else if (platform === 'darwin') resolve('aarch64-apple-darwin')
        else throw new Error('unsupported platform')
        break
      case 'x64':
        if (platform === 'linux') resolve('x86_64-unknown-linux-gnu')
        else if (platform === 'darwin') resolve('x86_64-apple-darwin')
        else if (platform === 'win32') resolve('x86_64-pc-windows-msvc')
        else if (platform === 'freebsd') resolve('x86_64-unknown-freebsd')
        else if (platform === 'sunos') resolve('x86_64-sun-solaris')
        else throw new Error('unsupported platform')
        break
      case 's390x':
        if (platform === 'linux') resolve('s390x-unknown-linux-gnu')
        else throw new Error('unsupported platform')
        break
    }

    throw new Error('unsupported or missing platform')
  })
}
