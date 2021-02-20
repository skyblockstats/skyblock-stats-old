import * as nunjucks from 'nunjucks'
import express from 'express'
import { fetchPlayer, fetchProfile } from './hypixel'
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

env.addFilter('clean', (word: string) => {
	return word
		.replace(/^./, word[0].toUpperCase())
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

// we use bodyparser to be able to get data from req.body
const urlencodedParser = bodyParser.urlencoded({ extended: false })

// redirect post requests from /player to /player/:user
app.post('/player', urlencodedParser, (req, res) => {
	res.redirect('/player/' + req.body['user-search'])
})

// we use serveStatic so it caches
app.use(serveStatic('src/public'))

app.listen(8081, () => console.log('App started :)'))
