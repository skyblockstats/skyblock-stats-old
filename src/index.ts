import {
	skyblockConstantValues,
	skyblockItemNameToItem,
	AccountCustomization,
	CleanMemberProfile,
	fetchLeaderboards,
	skyblockItemToUrl,
	cacheInventories,
	fetchLeaderboard,
	itemToUrlCached,
	createSession,
	fetchElection,
	updateAccount,
	fetchSession,
	fetchProfile,
	fetchPlayer,
	CleanUser,
	NotFound,
	baseApi,
} from './hypixel'
import {
	formattingCodeToHtml,
	removeFormattingCode,
	toRomanNumerals,
	skyblockTime,
	cleanNumber,
	colorCodes,
	shuffle,
	clean,
} from './util'
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
env.addGlobal('getTime', () => Date.now() / 1000)
env.addGlobal('colorCodes', colorCodes)

const hash = crypto.createHash('sha1')
hash.setEncoding('hex')
hash.write(fsSync.readFileSync('src/public/style.css'))
hash.end()

env.addGlobal('styleFileHash', hash.read())

env.addGlobal('getConstants', () => skyblockConstantValues)

env.addGlobal('skyblockTime', skyblockTime)

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

env.addFilter('trim', (s: string) => s.trim() )

// convert all the emojis in a string into images
env.addFilter('twemojiHtml', (s: string) => {
	let htmlEncoded = s.replace('<', '&lt;').replace('>', '&gt;').replace('&', '&amp;')
	// replace unicode emojis with <img src="/emoji/[hex].svg">
	let asTwemoji = htmlEncoded.replace(emojiRegex, (match) => {
		return `<img src="/emoji/${[...match].map(p => p.codePointAt(0).toString(16)).join('-')}.svg" class="emoji">`
	})
	return asTwemoji
} )

const emojiRegex = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g

let emojis: Record<string, string> = {}
// list items in src/public/emoji
// and create a map of emoji hex to emoji unicode
async function initEmojis() {
	const emojiFiles = await fs.readdir('src/public/emoji')
	for (const file of emojiFiles) {
		const hex = file.split('.')[0]
		// get the unicode emoji from the hex, codepoints are separated by '-'
		const emoji = hex.split('-').map(p => String.fromCodePoint(parseInt(p, 16))).join('')
		emojis[hex] = emoji
	}
}
initEmojis()

let donators: CleanUser[] = []

const admins = [
	'6536bfed869548fd83a1ecd24cf2a0fd' // mat
]

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
	let data: CleanUser
	try {
		data = await fetchPlayer(req.params.user, false, true)
	} catch (err) {
		if (err instanceof NotFound)
			return res.status(404).render('errors/notfound.njk')
		else
			throw err
	}
	if (data.profiles.length === 0) {
		return res.status(404).render('errors/noprofiles.njk', { data })
	}
	if (req.params.user !== data?.player?.username)
		return res.redirect(`/player/${data.player.username}`)
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
	return res.status(404).render('errors/notfound.njk')
})


app.get('/player/:user/:profile', async(req, res) => {
	let data: CleanMemberProfile
	try {
		data = await fetchProfile(req.params.user, req.params.profile, true)
	} catch (err) {
		if (err instanceof NotFound)
			return res.redirect(`/player/${req.params.user}`)
		else
			throw err
	}

	if (req.params.profile !== data.profile.name)
		return res.redirect(`/player/${data.member.username}/${data.profile.name}`)
	else if (req.params.user !== data.member.username)
		return res.redirect(`/player/${data.member.username}/${data.profile.name}`)


	const pack = req.query.pack as string ?? data?.customization?.pack
	const backgroundUrl = data?.customization?.backgroundUrl
	const blurBackground = data?.customization?.blurBackground ?? false
	const emoji = data?.customization?.emoji ?? false

	if (req.query.simple !== undefined)
		return res.render('member-simple.njk', { data })
	
	const promises = []
	for (const coll of data.member.collections) {
		promises.push(skyblockItemToUrl(coll.name))
	}	

	await cacheInventories(data.member.inventories, pack)
	await Promise.all(promises)

	res.render('member.njk', { data, pack, backgroundUrl, blurBackground, emoji })
})

app.get('/leaderboard/:name', async(req, res) => {
	const data = await fetchLeaderboard(req.params.name)
	await skyblockItemToUrl(data.name.slice(11))
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

const DISCORD_CLIENT_ID = '885347559382605916'

app.get('/login', async(req, res) => {
	res.redirect(`https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=https://${req.headers.host}%2Floggedin&response_type=code&scope=identify`)
})


app.get('/loggedin', async(req, res) => {
	const response = await createSession(req.query.code as string)
	console.log('response', response)
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

app.get('/election', async(req, res) => {
	const data = await fetchElection()
	res.render('election.njk', { data })
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
	if (!session || !session.account) return res.redirect('/login')

	const isDonator = !!donators.find(u => u.player.uuid === session.account.minecraftUuid)
	const isAdmin = !!admins.find(u => u === session.account.minecraftUuid)

	const player = await fetchPlayer(session.account.minecraftUuid)
	res.render(
		'account/profile.njk',
		{
			player,
			customization: session.account.customization,
			backgroundNames,
			isDonator: isDonator || isAdmin,
			emojis
		})
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

	const isDonator = !!donators.find(u => u.player.uuid === session.account.minecraftUuid)
	const isAdmin = !!admins.find(u => u === session.account.minecraftUuid)

	const customization: AccountCustomization = session.account.customization || {}
	if (req.body.pack)
		customization.pack = req.body.pack
	if (backgroundUrl)
		customization.backgroundUrl = backgroundUrl
	if (req.body['blur-toggle'])
		customization.blurBackground = req.body['blur-toggle'] === 'on'
	if (req.body['emoji'] !== undefined) {
		const emoji = req.body['emoji']
		const matched = emoji.match(emojiRegex)
		// if this isn't an emoji, remove the emoji from their profile
		if (emoji === '' || matched.length !== 1 || matched[0] !== emoji)
			customization.emoji = ''
		else if (isDonator || isAdmin) {
			customization.emoji = emoji
		}
	}
		


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


app.use(serveStatic('src/public', {
	maxAge: 86400000
}))

// this should always be the last route!
// shortcut that redirects the user to their active profile
app.get('/:user', async(req, res) => {
	let player: CleanUser
	try {
		player = await fetchPlayer(req.params.user)
	} catch (err) {
		if (err instanceof NotFound)
			return res.status(404).render('errors/notfound.njk')
		else
			throw err
	}
	if (player && player.activeProfile) {
		const activeProfileId = player.activeProfile
		const activeProfileName = player.profiles.find((profile) => profile.uuid === activeProfileId)
		if (activeProfileName?.name)
			return res.redirect(`/player/${player.player.username}/${activeProfileName?.name}`)
	}
	return res.status(404).render('errors/notfound.njk')
})

app.use((req, res, next) => {
	return res.status(404).render('errors/notfound.njk')
})



app.listen(8081, () => console.log('App started :)'))

