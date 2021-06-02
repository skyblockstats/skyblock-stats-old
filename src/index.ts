import {
	skyblockConstantValues,
	skyblockItemNameToItem,
	AccountCustomization,
	fetchLeaderboards,
	skyblockItemToUrl,
	cacheInventories,
	fetchLeaderboard,
	itemToUrlCached,
	createSession,
	updateAccount,
	fetchSession,
	fetchProfile,
	fetchPlayer,
	CleanUser,
	baseApi,
} from './hypixel'
import { clean, cleanNumber, formattingCodeToHtml, toRomanNumerals, shuffle, removeFormattingCode } from './util'
import WithExtension from '@allmarkedup/nunjucks-with'
import cookieParser from 'cookie-parser'
import serveStatic from 'serve-static'
import * as nunjucks from 'nunjucks'
import bodyParser from 'body-parser'
import { promises as fs } from 'fs'
import express from 'express'
import * as fsSync from 'fs'
import crypto from 'crypto'

const app = express()

app.use(cookieParser())
app.use(express.json())

const env = nunjucks.configure('src/views', {
	autoescape: true,
	express: app,
})

// we need this extension to have sections work correctly
env.addExtension('WithExtension', new WithExtension())
env.addGlobal('BASE_API', baseApi)
env.addGlobal('getTime', () => (new Date()).getTime() / 1000)

const hash = crypto.createHash('sha1')
hash.setEncoding('hex')
hash.write(fsSync.readFileSync('src/public/style.css'))
hash.end()

env.addGlobal('styleFileHash', hash.read())

env.addGlobal('getConstants', () => skyblockConstantValues)

env.addFilter('itemToUrl', (item, packName: string) => itemToUrlCached(item, packName))
env.addFilter('itemNameToUrl', (item, packName: string) => itemToUrlCached(skyblockItemNameToItem(item), packName))

env.addFilter('append', (arr: any[], item: any) => arr.concat(item))

env.addFilter('slice', (arr: any[], start?: number, end?: number) => arr.slice(start, end))

env.addFilter('startsWith', (string: string, substring: string) => string.startsWith(substring))

env.addFilter('cleannumber', cleanNumber)

env.addFilter('clean', clean)

env.addFilter('formattingCodeToHtml', formattingCodeToHtml)
env.addFilter('removeFormattingCode', removeFormattingCode)

env.addFilter('romanNumerals', toRomanNumerals)

env.addFilter('shuffle', shuffle)

env.addFilter('isString', o => typeof o === 'string' )

env.addFilter('round', o => Math.round(o) )

env.addFilter('formatnumber', (n: number, digits: number=3) => {
	// from https://stackoverflow.com/a/9462382 with some modifications
	const numberSymbolsLookup = [
		{ value: 1, symbol: '' },
		{ value: 1e3, symbol: 'k' },
		{ value: 1e6, symbol: 'M' },
		{ value: 1e9, symbol: 'G' },
		{ value: 1e12, symbol: 'T' },
		{ value: 1e15, symbol: 'P' },
		{ value: 1e18, symbol: 'E' },
	  ]
	  const item = numberSymbolsLookup.slice().reverse().find(item => n >= item.value)
	  return (n / item.value).toPrecision(digits).replace(/\.0+$|(\.[0-9]*[1-9])0+$/, '$1') + item.symbol
})

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
	res.render('index.njk', { donators, loggedIn: req.cookies.sid !== undefined })
})

app.get('/chat', (req, res) => {
	res.render('fakechat.njk')
})

app.get('/player/:user', async(req, res) => {
	const data = await fetchPlayer(req.params.user, false, true)
	res.render('profiles.njk', { data })
})

app.get('/profile/:user', async(req, res) => {
	const player = await fetchPlayer(req.params.user)
	if (player && player.activeProfile) {
		const activeProfileId = player.activeProfile
		const activeProfileName = player.profiles.find((profile) => profile.uuid === activeProfileId)
		if (activeProfileName?.name)
			return res.redirect(`/player/${player.player.username}/${activeProfileName?.name}`)
	}
	return res.status(404).send('Not found')
})


app.get('/player/:user/:profile', async(req, res) => {
	const data = await fetchProfile(req.params.user, req.params.profile, true)
	if (!data)
		return res.status(404).send('Not found')
	const pack = req.query.pack as string ?? data?.customization?.pack
	const backgroundUrl = data?.customization?.backgroundUrl
	if (req.query.simple !== undefined)
		return res.render('member-simple.njk', { data })
	await cacheInventories(data.member.inventories, pack)
	res.render('member.njk', { data, pack, backgroundUrl })
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

	const promises = []
	for (const leaderboardName of data.collection) {
		promises.push(skyblockItemToUrl(leaderboardName.slice(11)))
	}
	await Promise.all(promises)

	res.render('leaderboards.njk', { data })
})


app.get('/leaderboard', async(req, res) => {
	res.redirect('/leaderboards')
})

const DISCORD_CLIENT_ID = '656634948148527107'

app.get('/login', async(req, res) => {
	res.redirect(`https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=https://${req.headers.host}%2Floggedin&response_type=code&scope=identify`)
})


app.get('/loggedin', async(req, res) => {
	const response = await createSession(req.query.code as string)
	if (response.ok) {
		res.cookie('sid', response.session_id, { maxAge: 31536000000 })
		res.redirect('/verify')
	} else
		res.redirect('/login')
})


app.get('/verify', async(req, res) => {
	if (!req.cookies.sid) return res.redirect('/login')
	res.render('account/verify.njk')
})


// we use bodyparser to be able to get data from req.body
const urlencodedParser = bodyParser.urlencoded({ extended: false })


app.post('/verify', urlencodedParser, async(req, res) => {
	if (!req.cookies.sid) return res.redirect('/login')
	if (!req.body.ign) return res.redirect('/verify')
	const session = await fetchSession(req.cookies.sid)
	if (!session) return res.redirect('/login')
	const username = req.body.ign
	const player = await fetchPlayer(username, true)

	const hypixelDiscordName = player?.player?.socials?.discord

	if (!hypixelDiscordName)
		return res.render('account/verify.njk', { error: 'Please link your Discord in Hypixel by doing /profile -> Social media -> Discord. If you just changed it, wait a few minutes and try again.' })

	const actualDiscordName = session.session.discord_user.name
	const actualDiscordIdDiscrim = session.session.discord_user.id + '#' + session.session.discord_user.name.split('#')[1]

	if (!(hypixelDiscordName === actualDiscordName || hypixelDiscordName === actualDiscordIdDiscrim))
		return res.render(
			'account/verify.njk',
			{ error: `You\'re linked to ${hypixelDiscordName} on Hypixel, change this to ${actualDiscordName} by doing /profile -> Social media -> Discord. If you just changed it, wait a few minutes and try again.` }
		)

	await updateAccount({
		discordId: session.session.discord_user.id,
		minecraftUuid: player.player.uuid
	})

	res.redirect('/profile')
})

let backgroundNames: string[]
fs.readdir('src/public/backgrounds').then(names => {
	backgroundNames = names
})

app.get('/profile', async(req, res) => {
	if (!req.cookies.sid) return res.redirect('/login')
	const session = await fetchSession(req.cookies.sid)
	if (!session) return res.redirect('/login')

	const player = await fetchPlayer(session.account.minecraftUuid)
	res.render('account/profile.njk', { player, customization: session.account.customization, backgroundNames })
})

app.post('/profile', urlencodedParser, async(req, res) => {
	if (!req.cookies.sid) return res.redirect('/login')
	const session = await fetchSession(req.cookies.sid)
	if (!session) return res.redirect('/login')

	const backgroundName: string = req.body['background']

	// prevent people from putting non-existent backgrounds
	if (backgroundName && !backgroundNames.includes(backgroundName))
		return res.send('That background doesn\'t exist. ')

	const backgroundUrl = backgroundName ? `/backgrounds/${backgroundName}` : undefined

	const customization: AccountCustomization = session.account.customization || {}
	if (req.body.pack)
		customization.pack = req.body.pack
	if (backgroundUrl)
		customization.backgroundUrl = backgroundUrl

	await updateAccount({
		discordId: session.account.discordId,
		customization
	})
	res.redirect('/profile')
})


// redirect post requests from /player to /player/:user
app.post('/player', urlencodedParser, (req, res) => {
	res.redirect('/player/' + req.body['user-search'])
})


app.get('/profiles/:user', async(req, res) => {
	res.redirect(`/player/${req.params.user}`)
})
app.get('/profile/:user/:profile', async(req, res) => {
	res.redirect(`/player/${req.params.user}/${req.params.profile}`)
})
app.get('/chat.png', async(req, res) => {
	const query: Record<string, string> = {}
	for (const key of Object.keys(req.query)) {
		query[key] = req.query[key].toString()
	}
	const queryString = new URLSearchParams(query).toString()
	res.redirect(`https://fake-chat.matdoes.dev/render.png?${queryString}`)
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

