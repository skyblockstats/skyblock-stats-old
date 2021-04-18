import { baseApi, cacheInventories, fetchLeaderboard, fetchLeaderboards, fetchPlayer, fetchProfile, itemToUrl, itemToUrlCached } from './hypixel'
import WithExtension from '@allmarkedup/nunjucks-with'
import serveStatic from 'serve-static'
import * as nunjucks from 'nunjucks'
import bodyParser from 'body-parser'
import express from 'express'

const app = express()

const env = nunjucks.configure('src/views', {
	autoescape: true,
	express: app,
})

// we need this extension to have sections work correctly
env.addExtension('WithExtension', new WithExtension())
env.addGlobal('BASE_API', baseApi)
env.addGlobal('getTime', () => (new Date()).getTime() / 1000)
env.addFilter('itemToUrl', (item) => {
	return itemToUrlCached(item)
})
env.addFilter('append', (arr: any[], item: any) => {
	arr.push(item)
	return arr
})


function moveStringToEnd(word: string, thing: string) {
	if (thing.startsWith(`${word}_`))
		thing = thing.substr(`${word}_`.length) + `_${word}`
	return thing
}


function millisecondsToTime(totalMilliseconds: number) {
	const totalSeconds = totalMilliseconds / 1000
	const totalMinutes = totalSeconds / 60
	const totalHours = totalMinutes / 60

	const milliseconds = Math.floor(totalMilliseconds) % 1000
	const seconds = Math.floor(totalSeconds) % 60
	const minutes = Math.floor(totalMinutes) % 60
	const hours = Math.floor(totalHours)

	const stringUnits: string[] = []

	if (hours > 1) stringUnits.push(`${hours} hours`)
	else if (hours == 1) stringUnits.push(`${hours} hour`)
	if (minutes > 1) stringUnits.push(`${minutes} minutes`)
	else if (minutes == 1) stringUnits.push(`${minutes} minute`)
	if (seconds > 1) stringUnits.push(`${seconds} seconds`)
	else if (seconds == 1) stringUnits.push(`${seconds} second`)
	if (milliseconds > 1) stringUnits.push(`${milliseconds} milliseconds`)
	else if (milliseconds == 1) stringUnits.push(`${milliseconds} millisecond`)
	return stringUnits.slice(0, 2).join(' and ')
}

function cleanNumber(number: number, unit?: string): string {
	switch (unit) {
		case 'time':
			return millisecondsToTime(number)
		case 'date':
			return (new Date(number * 1000)).toUTCString()
	}
	return number.toLocaleString() + ' ' + unit
}

env.addFilter('cleannumber', cleanNumber)

env.addFilter('clean', (thing: string | number) => {
	if (typeof thing === 'number') {
		return cleanNumber(thing)
	} else {
		for (const string of ['deaths', 'kills', 'collection', 'skill'])
			thing = moveStringToEnd(string, thing)
		return thing
			.replace(/^./, thing[0].toUpperCase())
			.replace(/_/g, ' ')
	}
})



app.get('/', (req, res) => {
	res.render('index.njk', {})
})

app.get('/player/:user', async(req, res) => {
	const data = await fetchPlayer(req.params.user)
	res.render('profiles.njk', { data })
})


app.get('/player/:user/:profile', async(req, res) => {
	const data = await fetchProfile(req.params.user, req.params.profile)
	await cacheInventories(data.member.inventories)
	res.render('member.njk', { data })
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
