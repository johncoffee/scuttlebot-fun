import pull = require('pull-stream')
import { join } from 'path'
import { promisify } from 'util'
import { writeFile } from 'fs-extra'

const ssbClient = require('ssb-client')

const {collect, filter, map, through, onEnd} = pull

promisify(ssbClient)().then(async sbot => {

  const outfile = 'liked-posts.txt'
  const dataDir = join(__dirname, '../data')
  // const me = '@WrhBwCVvOWAk8hTlCAJJDNpu2oxvumb8gxyOooTKyoE=.ed25519'
  // await ensureDir(dataDir)

  const voteMap = new Map<string, number>()
  const postMap = new Map<string, Object>()

  console.debug( "Loading..." )
  pull(
    sbot.createFeedStream({
      limit: 10000, // not setting a limit will probably freeze your program for a few minutes
      reverse: true,
    }),

    through(msg => {
      switch (msg.value.content.type) {
        case "vote":
          if (msg.value.content.vote) // wat
            voteMap.set(msg.value.content.vote.link, (voteMap.get(msg.value.content.vote.link) || 0) + 1)
          break
        case "post":
          postMap.set(msg.key, msg)
          break
      }
    }),

    // filter(msg => msg.value.content.type === 'post'),
    // map(msg => {
    //   return msg.value.content
    // }),

    onEnd((err, msgContents) => {
      if (err) throw err

      // console.debug(msgContents.length)
      // console.debug(JSON.stringify(msgContents[0], null, 2))

      type Post = {
        msg: {[k:string]: any},
        count: number,
      }

      const votes:string[] = Array.from(voteMap.entries())
        .filter(([msgId]) => postMap.has(msgId))
        .map(([msgId, votes]) => {
          return <Post>{
            msg: postMap.get(msgId),
            count: votes,
          }
        })
        .sort((a, b) => a.count < b.count ? 1 : -1)
        .map(obj =>
`  ${obj.msg.key}
  votes: ${obj.count}
  ${obj.msg.value.content.text}
  `)

      votes.length = 10
      writeFile(join(dataDir, outfile),`Latest popular posts: \n\n ${votes.join(`\n\n -------------------- \n`)} `)

      sbot.close()
      // writeFile(join(dataDir, outfile), JSON.stringify(msgContents, null, 2))
    }),
  )
})

