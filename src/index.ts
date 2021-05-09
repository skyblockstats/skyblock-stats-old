import {
	skyblockConstantValues,
	fetchLeaderboards,
	cacheInventories,
	fetchLeaderboard,
	itemToUrlCached,
	fetchProfile,
	fetchPlayer,
	CleanUser,
	baseApi,
} from './hypixel'
import { clean, cleanNumber, formattingCodeToHtml, toRomanNumerals, shuffle } from './util'
import WithExtension from '@allmarkedup/nunjucks-with'
import express from 'express'
import serveStatic from 'serve-static'
import * as nunjucks from 'nunjucks'
import bodyParser from 'body-parser'
import { promises as fs } from 'fs'

const app = express()

const env = nunjucks.configure('src/views', {
	autoescape: true,
	express: app,
})

// we need this extension to have sections work correctly
env.addExtension('WithExtension', new WithExtension())
env.addGlobal('BASE_API', baseApi)
env.addGlobal('getTime', () => (new Date()).getTime() / 1000)


env.addGlobal('getConstants', () => skyblockConstantValues)

env.addFilter('itemToUrl', (item, packName: string) => {
	return itemToUrlCached(item, packName)
})
env.addFilter('append', (arr: any[], item: any) => arr.concat(item))

env.addFilter('slice', (arr: any[], start?: number, end?: number) => arr.slice(start, end))

env.addFilter('startsWith', (string: string, substring: string) => string.startsWith(substring))

env.addFilter('cleannumber', cleanNumber)

env.addFilter('clean', clean)

env.addFilter('formattingCodeToHtml', formattingCodeToHtml)

env.addFilter('romanNumerals', toRomanNumerals)

env.addFilter('shuffle', shuffle)


let donators = []

async function initDonators() {
	const donatorsFileRaw = await fs.readFile('src/donators.txt', { encoding: 'ascii'})
	const donatorUuids = donatorsFileRaw.split('\n').filter(u => u).map(u => u.split(' ')[0])
	const promises: Promise<CleanUser>[] = []
	for (const donatorUuid of donatorUuids) {
		promises.push(fetchPlayer(donatorUuid, true))
	}
	donators = await Promise.all(promises)
}
initDonators()

app.get('/', (req, res) => {
	res.render('index.njk', { donators })
})

app.get('/chat', (req, res) => {
	res.render('fakechat.njk')
})

app.get('/player/:user', async(req, res) => {
	const data = await fetchPlayer(req.params.user)
	res.render('profiles.njk', { data })
})


app.get('/player/:user/:profile', async(req, res) => {
	const data = await fetchProfile(req.params.user, req.params.profile)
	if (req.query.simple !== undefined)
		return res.render('member-simple.njk', { data })
	await cacheInventories(data.member.inventories, req.query.pack as string)
	res.render('member.njk', { data, pack: req.query.pack })
})

app.get('/leaderboard/:name', async(req, res) => {
	const data = await fetchLeaderboard(req.params.name)
	res.render('leaderboard.njk', { data })
})

app.get('/leaderboards/:name', async(req, res) => {
	res.redirect(`/leaderboard/${req.params.name}`)
})

app.get('/leaderboards', async(req, res) => {
	const data = await fetchLeaderboards()
	res.render('leaderboards.njk', { data })
})

app.get('/leaderboard', async(req, res) => {
	res.redirect('/leaderboards')
})

// we use bodyparser to be able to get data from req.body
const urlencodedParser = bodyParser.urlencoded({ extended: false })

// redirect post requests from /player to /player/:user
app.post('/player', urlencodedParser, (req, res) => {
	res.redirect('/player/' + req.body['user-search'])
})


// we use serveStatic so it caches
app.use(serveStatic('src/public'))

// this should always be the last route!
// shortcut that redirects the user to their active profile
app.get('/:user', async(req, res) => {
	const player = await fetchPlayer(req.params.user)
	if (player && player.activeProfile) {
		const activeProfileId = player.activeProfile
		const activeProfileName = player.profiles.find((profile) => profile.uuid === activeProfileId)
		if (activeProfileName?.name)
			return res.redirect(`/player/${player.player.username}/${activeProfileName?.name}`)
	}
	return res.status(404).send('Not found')
})



app.listen(8081, () => console.log('App started :)'))
