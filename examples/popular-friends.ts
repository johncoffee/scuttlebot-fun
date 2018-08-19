import pull = require('pull-stream')
import { join } from 'path'
import { ensureDir, writeFile } from 'fs-extra'
import { promisify } from 'util'

const ssbClient = require('ssb-client')

const {collect, filter, drain, through, map} = pull

promisify(ssbClient)().then(async sbot => {

  const outfile = __filename.replace(".ts", ".json")
  const dataDir = join(__dirname, "../data")

  const me = '@WrhBwCVvOWAk8hTlCAJJDNpu2oxvumb8gxyOooTKyoE=.ed25519'

  await ensureDir(dataDir)

  const followingMe = await getFollowing(me, sbot)
  console.debug('i follow ' + followingMe.size)

  const map = new Map<string, Set<string>>()
  for (let id of followingMe) {
    console.debug("Collecting "+id)
    const followers = await getFollowing(id, sbot)
    map.set(id, followers)
  }

  sbot.close()
  sbot = undefined

  let list = Array.from( map.entries() )
    .map(([k,v]) => {
      return {
        id: k,
        count: v.size
      }
    })

  list = list.filter(v => v.count > 0)
  list = list.sort((a, b) => a.count < b.count ? 1 : -1)

  await writeFile(join(dataDir, `/${outfile}`),
    JSON.stringify(list,null,2)
  )

  console.debug("Done.")
})

function getFollowing (id: string, sbot: any): Promise<Set<string>> {
  return new Promise(((resolve, reject) => {
    pull(
      sbot.createUserStream({id}),
      // sbot.messagesByType({ type: 'contact' }),

      map(msg => msg.value.content),
      filter(content => content.type === 'contact'),

      collect(function (err, msgContents) {
        if (err) return reject()

        const isFollowing = new Set()

        msgContents.forEach(msg => (msg.following) ?
          isFollowing.add(msg.contact) :
          isFollowing.delete(msg.contact))

        // const types = new Set()
        // msgContents.forEach(m => types.add(m.type))
        // console.debug(types)

        // console.debug(isFollowing.size)
        // console.debug(JSON.stringify(Array.from(isFollowing), null, 2))
        resolve(isFollowing)
      }),
    )
  }))
}

// { key: '%P4oRBGUXQt+z8ystuW4jVs6bqdvQF6JJbDtBSo/ngu8=.sha256',
//   value:
//   { previous: '%+WZoQtA6sf0+Og5QMRIy0OgY8ov9z9bwrlXpLoUbtQs=.sha256',
//     author: '@WrhBwCVvOWAk8hTlCAJJDNpu2oxvumb8gxyOooTKyoE=.ed25519',
//     sequence: 3,
//     timestamp: 1520346107069,
//     hash: 'sha256',
//     content:
//     { type: 'post',
//       text: 'Still in Faro, chilling...',
//       mentions: [] },
//     signature: 'iKvYAFtxUWxSX+YkK3vnlzfW1bmfC1FEbv2UnqyyAV9cxc7y7/6p7HKKqwhvWHznrsGXzgJnpDM6UqwlKQ2+BA==.sig.ed25519' },
//   timestamp: 1520346107070 }
