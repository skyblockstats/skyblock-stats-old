import * as nunjucks from 'nunjucks'
import * as express from 'express'

const app = express()

const env = nunjucks.configure('views', {
	autoescape: true,
	express: app
})

app.get('/', function(req, res) {
	res.render('index.html', {})
})

app.use('/', express.static('public'))

app.listen(8081, () => console.log('pog'))
