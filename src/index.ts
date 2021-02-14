import * as nunjucks from 'nunjucks'
import express from 'express'
import path from 'path'

const app = express()

const env = nunjucks.configure('src/views', {
	autoescape: true,
	express: app
})

app.get('/', function(req, res) {
	res.render('index.html', {})
})

app.use('/', express.static('src/public'))

app.listen(8081, () => console.log('pog'))
