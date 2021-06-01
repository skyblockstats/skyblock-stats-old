import fetch from 'node-fetch'
import NodeCache from 'node-cache'
import { Agent } from 'https'
import vanillaDamages from 'skyblock-assets/data/vanilla_damages.json'
// import { Agent } from 'http'

import * as skyblockAssets from 'skyblock-assets'

if (!process.env.key)
	// if there's no key in env, run dotenv
	require('dotenv').config()

export const baseApi = 'https://skyblock-api.matdoes.dev'
// export const baseApi = 'http://localhost:8080'

// We need to create an agent to prevent memory leaks and to only do dns lookups once
export const httpsAgent = new Agent({
	keepAlive: true
})

export let skyblockConstantValues = null

/**
 * Fetch skyblock-api
 * @param path The url path, for example `player/py5/Strawberry`. This shouldn't have any trailing slashes
 * @param retry How many times it'll retry the request before failing
 */
 async function fetchApi(path, retry: number=3) {
	const fetchUrl = `${baseApi}/${path}`
	try {
		const fetchResponse = await fetch(
			fetchUrl,
			{
				agent: () => httpsAgent,
				headers: { key: process.env.key },
			}
		)
		return await fetchResponse.json()
	} catch (err) {
		if (retry > 0) {
			// wait 5 seconds and retry
			await new Promise(resolve => setTimeout(resolve, 5000))
			return await fetchApi(path, retry - 1)
		} else {
			throw err
		}
	}
}

/**
 * Post to skyblock-api
 * @param path The url path, for example `player/py5/Strawberry`. This shouldn't have any trailing slashes
 * @param data The data (as json) that should be posted
 */
 async function postApi(path, data: any, retry: boolean=true) {
	const fetchUrl = `${baseApi}/${path}`
	try {
		const fetchResponse = await fetch(
			encodeURI(fetchUrl),
			{
				agent: () => httpsAgent,
				headers: {
					key: process.env.key,
					'content-type': 'application/json'
				},
				method: 'POST',
				body: JSON.stringify(data)
			}
		)
		return await fetchResponse.json()
	} catch (err) {
		if (retry) {
			// wait 5 seconds and retry
			await new Promise(resolve => setTimeout(resolve, 5000))
			return await postApi(path, data, false)
		} else {
			throw err
		}
	}
}

async function updateConstants() {
	skyblockConstantValues = await fetchApi('constants')
}

setInterval(updateConstants, 60 * 60 * 1000) // update every hour
updateConstants()

/**
 * Fetch a player
 * @param user A username or UUID
 * @param basic Whether it should only return very basic information about the user
 * @param customization Whether it should return extra customization data like the player's selected pack and background
 */
export async function fetchPlayer(user: string, basic: boolean=false, customization: boolean=false): Promise<CleanUser> {
	return await fetchApi(`player/${user}?basic=${basic}&customization=${customization}`)
}


/**
 * Fetch a profile
 * @param user A username or UUID
 * @param profile A profile name or UUID
 * @param customization Whether it should return extra customization data like the player's selected pack and background
 */
export async function fetchProfile(user: string, profile: string, customization: boolean=false): Promise<CleanMemberProfile> {
	return await fetchApi(`player/${user}/${profile}?customization=${customization}`,)
}

export async function fetchLeaderboard(name: string) {
	return await fetchApi(`leaderboard/${name}`)
}

export async function fetchLeaderboards(): Promise<{ [category: string]: string[] }> {
	return await fetchApi(`leaderboards`)
}

const itemToUrlCache = new NodeCache({
	stdTTL: 60,
	checkperiod: 5,
	useClones: false,
})

export async function itemToUrl(item: Item, packName?: string): Promise<string> {
	const stringifiedItem = (packName ?? 'packshq') + JSON.stringify(item)

	if (itemToUrlCache.has(stringifiedItem))
		return itemToUrlCache.get(stringifiedItem)

	const itemNbt: skyblockAssets.NBT = {
		display: {
			Name: item.display?.name
		},
		ExtraAttributes: {
			id: item.id,
		},
	}

	let textureUrl: string

	if (item.head_texture)
		textureUrl = `https://mc-heads.net/head/${item.head_texture}`
	else
		textureUrl = await skyblockAssets.getTextureUrl({
			id: item.vanillaId,
			nbt: itemNbt,
			pack: packName || 'packshq'
		})
	
	if (!textureUrl) {
		console.log('no texture', item)
	}

	itemToUrlCache.set(stringifiedItem, textureUrl)
	return textureUrl
}

export async function skyblockItemToUrl(skyblockItemName: string) {
	let item = skyblockItemNameToItem(skyblockItemName)
	const itemTextureUrl = await itemToUrl(item, 'packshq')
	return itemTextureUrl
}

export function skyblockItemNameToItem(skyblockItemName: string): Item {
	let item: Item
	if (Object.keys(skyblockItems).includes(skyblockItemName)) {
		item = skyblockItems[skyblockItemName]
	} else {
		item = {
			vanillaId: `minecraft:${skyblockItemName}`
		}
	}
	return item
}

const skyblockItems: { [ itemName: string ]: Item } = {
	ink_sac: { vanillaId: 'minecraft:dye' },
	cocoa_beans: { vanillaId: 'minecraft:dye:3' },
	lapis_lazuli: { vanillaId: 'minecraft:dye:4' },
	lily_pad: { vanillaId: 'minecraft:waterlily' },
	melon_slice: { vanillaId: 'minecraft:melon' },
	mithril_ore: {
		vanillaId: 'minecraft:prismarine_crystals',
		display: { name: 'Mithril Ore' }
	},
	acacia_log: { vanillaId: 'minecraft:log2' },
	birch_log: { vanillaId: 'minecraft:log:2' },
	cod: { vanillaId: 'minecraft:fish' },
	dark_oak_log: { vanillaId: 'minecraft:log:2' },
	jungle_log: { vanillaId: 'minecraft:log:3' },
	oak_log: { vanillaId: 'minecraft:log' },
	pufferfish: { vanillaId: 'minecraft:fish:3' },
	salmon: { vanillaId: 'minecraft:fish:1' },
	spruce_log: { vanillaId: 'minecraft:log:1' },
}


export function itemToUrlCached(item: Item, packName?: string): string {
	if (!item) return null
	if (typeof item === 'string') {
		let itemId: string = vanillaDamages[item] ?? item
		let damage: number = null
		if (itemId.startsWith('minecraft:')) itemId = itemId.slice('minecraft:'.length)
		if (itemId.includes(':')) {
			damage = parseInt(itemId.split(':')[1])
			itemId = itemId.split(':')[0]
		}
		item = {
			count: 1,
			display: {
				glint: false,
				lore: null,
				name: null
			},
			id: null,
			vanillaId: `minecraft:${itemId}`
		}
	}

	const stringifiedItem = (packName || 'packshq') + JSON.stringify(item)
	return itemToUrlCache.get(stringifiedItem)
}

/** Get all the items in an inventories object to cache them */
export async function cacheInventories(inventories: Inventories, packName?: string) {
	const promises: Promise<any>[] = []
	for (const inventoryItems of Object.values(inventories ?? {}))
		for (const inventoryItem of inventoryItems)
			if (inventoryItem)
				promises.push(itemToUrl(inventoryItem, packName))
	await Promise.all(promises)
}


export async function createSession(code: string) {
	return await postApi(`accounts/createsession`, { code })
}
export async function fetchSession(sessionId: string): Promise<{ session: SessionSchema, account: AccountSchema }> {
	return await postApi(`accounts/session`, { uuid: sessionId })
}

export async function updateAccount(data: AccountSchema) {
	// this is checked with the key env variable, so it's mostly secure
	return await postApi(`accounts/update`, data)
}


export interface CleanUser {
	player: CleanPlayer
	profiles?: CleanProfile[]
	activeProfile?: string
	online?: boolean
	customization?: AccountCustomization
}

interface CleanMemberProfile {
	member: CleanMemberProfilePlayer
	profile: CleanFullProfileBasicMembers
	customization: AccountCustomization
}

interface Item {
	id?: string
	count?: number
	vanillaId: string

	display?: {
		name?: string
		lore?: string[]
		glint?: boolean
	}

	reforge?: string
	anvil_uses?: number
	timestamp?: string
	enchantments?: { [ name: string ]: number }

	head_texture?: string
}

const INVENTORIES = {
	armor: 'inv_armor',
	inventory: 'inv_contents',
	ender_chest: 'ender_chest_contents',
	talisman_bag: 'talisman_bag',
	potion_bag: 'potion_bag',
	fishing_bag: 'fishing_bag',
	quiver: 'quiver',
	trick_or_treat_bag: 'candy_inventory_contents',
	wardrobe: 'wardrobe_contents'
}

export type Inventories = { [name in keyof typeof INVENTORIES ]: Item[] }

interface AccountSchema {
	_id?: string
	discordId: string
	minecraftUuid?: string
	customization?: AccountCustomization
}

interface CleanPlayer extends CleanBasicPlayer {
    rank: CleanRank
    socials: CleanSocialMedia
    profiles?: CleanBasicProfile[]
    first_join: number
}

interface CleanProfile extends CleanBasicProfile {
    members?: CleanBasicMember[]
}

interface CleanMemberProfilePlayer extends CleanPlayer {
	// The profile name may be different for each player, so we put it here
	profileName: string
	first_join: number
	last_save: number
	bank?: Bank
	purse?: number
	stats?: StatItem[]
	rawHypixelStats?: { [ key: string ]: number }
	minions?: CleanMinion[]
	fairy_souls?: FairySouls
	inventories?: Inventories
	objectives?: Objective[]
	skills?: Skill[]
	visited_zones?: Zone[]
	collections?: Collection[]
	slayers?: SlayerData
}

interface CleanFullProfileBasicMembers extends CleanProfile {
    members: CleanBasicMember[]
    bank: Bank
    minions: CleanMinion[]
	minion_count: number
}

export interface AccountCustomization {
	backgroundUrl?: string
	pack?: string
}

interface CleanBasicPlayer {
    uuid: string
    username: string
}

interface CleanRank {
	name: string,
	color: string | null,
	colored: string | null,
}

interface CleanSocialMedia {
	discord: string | null
	forums: string | null
}

interface CleanBasicProfile {
    uuid: string

    // the name depends on the user, so its sometimes not included
    name?: string
}

interface CleanBasicMember {
	uuid: string
	username: string
	last_save: number
	first_join: number
	rank: CleanRank
}

interface Bank {
	balance: number
	history: any[]
}

interface StatItem {
	rawName: string
	value: number
	categorizedName: string
	category: string
	unit: string
}

interface CleanMinion {
    name: string,
    levels: boolean[]
}

interface FairySouls {
	total: number
	/** The number of fairy souls that haven't been exchanged yet */
	unexchanged: number
	exchanges: number
}

interface Objective {
	name: string
	completed: boolean
}

interface Skill {
	name: string
	xp: number
}

interface Zone {
	name: string
	visited: boolean
}

interface Collection {
	name: string
	xp: number
	level: number
	category: CollectionCategory
}

interface SlayerData {
	xp: number
	kills: number
	bosses: Slayer[]
}

const COLLECTIONS = {
	'farming': [
		'wheat',
		'carrot',
		'potato',
		'pumpkin',
		'melon_slice',
		'wheat_seeds',
		'red_mushroom',
		'cocoa_beans',
		'cactus',
		'sugar_cane',
		'feather',
		'leather',
		'porkchop',
		'chicken',
		'mutton',
		'rabbit',
		'nether_wart'
	],
	'mining': [
		'cobblestone',
		'coal',
		'iron_ingot',
		'gold_ingot',
		'diamond',
		'lapis_lazuli',
		'emerald',
		'redstone',
		'quartz',
		'obsidian',
		'glowstone_dust',
		'gravel',
		'ice',
		'netherrack',
		'sand',
		'end_stone'
	],
	'combat': [
		'rotten_flesh',
		'bone',
		'string',
		'spider_eye',
		'gunpowder',
		'ender_pearl',
		'ghast_tear',
		'slime_ball',
		'blaze_rod',
		'magma_cream'
	],
	'foraging': [
		'oak_log',
		'spruce_log',
		'birch_log',
		'jungle_log',
		'acacia_log',
		'dark_oak_log'
	],
	'fishing': [
		'cod',
		'salmon',
		'tropical_fish',
		'pufferfish',
		'prismarine_shard',
		'prismarine_crystals',
		'clay_ball',
		'lily_pad',
		'ink_sac',
		'sponge'
	],
	// no item should be here, but in case a new collection is added itll default to this
	'unknown': []
} as const

type CollectionCategory = keyof typeof COLLECTIONS

interface Slayer {
	name: SlayerName
	raw_name: string
	xp: number
	kills: number
	tiers: SlayerTier[]
}


const SLAYER_NAMES = {
	spider: 'tarantula',
	zombie: 'revenant',
	wolf: 'sven'
} as const

type SlayerName = (typeof SLAYER_NAMES)[keyof typeof SLAYER_NAMES]

interface SlayerTier {
	tier: number,
	kills: number
}

interface SessionSchema {
	_id?: string
	refresh_token: string
	discord_user: {
		id: string
		name: string
	}
	lastUpdated: Date
}
