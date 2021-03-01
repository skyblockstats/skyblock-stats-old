"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const nunjucks = __importStar(require("nunjucks"));
const express_1 = __importDefault(require("express"));
const hypixel_1 = require("./hypixel");
const serve_static_1 = __importDefault(require("serve-static"));
const body_parser_1 = __importDefault(require("body-parser"));
const nunjucks_with_1 = __importDefault(require("@allmarkedup/nunjucks-with"));
const app = express_1.default();
const env = nunjucks.configure('src/views', {
    autoescape: true,
    express: app,
});
// we need this extension to have sections work correctly
env.addExtension('WithExtension', new nunjucks_with_1.default());
function moveStringToEnd(word, thing) {
    if (thing.startsWith(`${word}_`))
        thing = thing.substr(`${word}_`.length) + `_${word}`;
    return thing;
}
env.addFilter('clean', (thing) => {
    if (typeof thing === 'number') {
        return thing.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    else {
        thing = moveStringToEnd('deaths', thing);
        thing = moveStringToEnd('kills', thing);
        thing = moveStringToEnd('collection', thing);
        return thing
            .replace(/^./, thing[0].toUpperCase())
            .replace(/_/g, ' ');
    }
});
app.get('/', (req, res) => {
    res.render('index.njk', {});
});
app.get('/player/:user', async (req, res) => {
    const data = await hypixel_1.fetchPlayer(req.params.user);
    res.render('profiles.njk', { data });
});
app.get('/player/:user/:profile', async (req, res) => {
    const data = await hypixel_1.fetchProfile(req.params.user, req.params.profile);
    res.render('member.njk', { data });
});
app.get('/leaderboard/:name', async (req, res) => {
    const data = await hypixel_1.fetchLeaderboard(req.params.name);
    res.render('leaderboard.njk', { data, name: req.params.name });
});
app.get('/leaderboards/:name', async (req, res) => {
    res.redirect(`/leaderboard/${req.params.name}`);
});
app.get('/leaderboards', async (req, res) => {
    const data = await hypixel_1.fetchLeaderboards();
    res.render('leaderboards.njk', { data });
});
app.get('/leaderboard', async (req, res) => {
    res.redirect('/leaderboards');
});
// we use bodyparser to be able to get data from req.body
const urlencodedParser = body_parser_1.default.urlencoded({ extended: false });
// redirect post requests from /player to /player/:user
app.post('/player', urlencodedParser, (req, res) => {
    res.redirect('/player/' + req.body['user-search']);
});
// we use serveStatic so it caches
app.use(serve_static_1.default('src/public'));
app.listen(8081, () => console.log('App started :)'));
