import pull = require('pull-stream')
import { promisify } from 'util'

const ssbClient = require('ssb-client')

const {collect, filter, map} = pull

promisify(ssbClient)().then(async sbot => {

  // const outfile = "popular-friends.json"
  // const dataDir = join(__dirname, "../data")

  const me = '@WrhBwCVvOWAk8hTlCAJJDNpu2oxvumb8gxyOooTKyoE=.ed25519'
  //
  // await ensureDir(dataDir)

  pull(
    sbot.createUserStream({id:me}),

    map(msg => msg.value.content),

    filter(content => !!content.type), // i think private msgs has
    filter(content => content.type === 'about'),

    collect(function (err, msgContents) {
      if (err) throw err

      const types = new Set<string>()
      msgContents.forEach(c => types.add(c.type))
      console.debug(JSON.stringify(Array.from(types), null, 2))
      console.debug(msgContents)
      sbot.close()
    }),
  )
})

