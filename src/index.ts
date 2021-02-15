import * as nunjucks from 'nunjucks'
import express from 'express'
import { fetchPlayer } from './hypixel'
import serveStatic from 'serve-static'
import bodyParser from 'body-parser'

const app = express()

const env = nunjucks.configure('src/views', {
	autoescape: true,
	express: app
})

app.get('/', (req, res) => {
	res.render('index.html', {})
})

app.get('/player/:user', async(req, res) => {
	const data = await fetchPlayer(req.params.user)
	res.render('profiles.html', { data })
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
