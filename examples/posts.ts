import pull = require('pull-stream')
import { join } from 'path'
import { writeFile } from 'fs-extra'
import { promisify } from 'util'

const ssbClient = require('ssb-client')

const {collect, filter, map} = pull

promisify(ssbClient)().then(async sbot => {

  const outfile = 'posts.json'
  const dataDir = join(__dirname, '../data')
  // const me = '@WrhBwCVvOWAk8hTlCAJJDNpu2oxvumb8gxyOooTKyoE=.ed25519'
  // await ensureDir(dataDir)

  pull(
    sbot.createFeedStream({
      limit: 200 // not setting a limit will probably freeze your program for a few minutes
    }),

    filter(msg => msg.value.content.type === 'post'),
    // filter(msg => !/test/i.test(msg.value.content.text)),

    map(msg => {
      return {
        author: msg.value.author,
        text: msg.value.content.text,
      }
    }),

    collect((err, msgContents) => {
      if (err) throw err

      // console.debug(msgContents.length)
      // console.debug(msgContents[0])

      sbot.close()
      writeFile(join(dataDir, outfile), JSON.stringify(msgContents, null, 2))
    }),
  )
})

