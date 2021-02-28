import * as nunjucks from 'nunjucks'
import express from 'express'
import { fetchLeaderboard, fetchPlayer, fetchProfile } from './hypixel'
import serveStatic from 'serve-static'
import bodyParser from 'body-parser'
import WithExtension from '@allmarkedup/nunjucks-with'

const app = express()

const env = nunjucks.configure('src/views', {
	autoescape: true,
	express: app,
})

// we need this extension to have sections work correctly
env.addExtension('WithExtension', new WithExtension())

function moveStringToEnd(word: string, thing: string) {
	if (thing.startsWith(`${word}_`))
		thing = thing.substr(`${word}_`.length) + `_${word}`
	return thing
}

env.addFilter('clean', (thing: string) => {
	thing = moveStringToEnd('deaths', thing)
	thing = moveStringToEnd('kills', thing)
	thing = moveStringToEnd('collection', thing)
	return thing
		.replace(/^./, thing[0].toUpperCase())
		.replace(/_/g, ' ')
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
	res.render('member.njk', { data })
})

app.get('/leaderboard/:name', async(req, res) => {
	const data = await fetchLeaderboard(req.params.name)
	res.render('leaderboard.njk', { data, name: req.params.name })
})

// we use bodyparser to be able to get data from req.body
const urlencodedParser = bodyParser.urlencoded({ extended: false })

// redirect post requests from /player to /player/:user
app.post('/player', urlencodedParser, (req, res) => {
	res.redirect('/player/' + req.body['user-search'])
})

// we use serveStatic so it caches
app.use(serveStatic('src/public'))

app.listen(8081, () => console.log('App started :)'))
