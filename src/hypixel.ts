import fetch from 'node-fetch'
import { Agent } from 'https'
// import { Agent } from 'http'

if (!process.env.key)
	// if there's no key in env, run dotenv
	require('dotenv').config()

const baseApi = 'https://skyblock-api2.matdoes.dev' // TODO: change this to skyblock-api.matdoes.dev once it replaces the old one
// const baseApi = 'http://localhost:8080'

// We need to create an agent to prevent memory leaks and to only do dns lookups once
const httpsAgent = new Agent({
	keepAlive: true
})

/**
 * Fetch skyblock-api
 * @param path The url path, for example `player/py5/Strawberry`. This shouldn't have any trailing slashes
 */
async function fetchApi(path) {
	const fetchUrl = `${baseApi}/${path}`
	const fetchResponse = await fetch(
		fetchUrl,
		{
			agent: () => httpsAgent,
			headers: {
				key: process.env.key
			}
		}
	)
	return await fetchResponse.json()
}

/**
 * Fetch a player
 * @param user A username or UUID
 */
export async function fetchPlayer(user: string): Promise<CleanUser> {
	return await fetchApi(`player/${user}`)
}


/**
 * Fetch a profile
 * @param user A username or UUID
 * @profile A profile name or UUID
 */
export async function fetchProfile(user: string, profile: string): Promise<CleanFullProfile> {
	return await fetchApi(`player/${user}/${profile}`)
}

export async function fetchLeaderboard(name: string) {
	return await fetchApi(`leaderboard/${name}`)
}

export async function fetchLeaderboards() {
	return await fetchApi(`leaderboards`)
}

export interface CleanUser {
    player: CleanPlayer
    profiles?: CleanProfile[]
    activeProfile?: string
    online?: boolean
}


export interface CleanPlayer extends CleanBasicPlayer {
    rank: CleanRank
    socials: CleanSocialMedia
    profiles?: CleanBasicProfile[]
}

export interface CleanProfile extends CleanBasicProfile {
    members?: CleanBasicMember[]
}

export interface CleanBasicPlayer {
    uuid: string
    username: string
}

export interface CleanRank {
	name: string,
	color: string | null,
	colored: string | null,
}

export interface CleanSocialMedia {
	discord: string | null
	forums: string | null
}

/** A basic profile that only includes the profile uuid and name */
export interface CleanBasicProfile {
    uuid: string

    // the name depends on the user, so its sometimes not included
    name?: string
}

export interface CleanBasicMember {
    uuid: string
    username: string
    last_save: number
    first_join: number
}

export interface CleanFullProfile extends CleanProfile {
    members: (CleanMember|CleanBasicMember)[]
    bank: Bank
    minions: CleanMinion[]
	minion_count: number
}

export interface CleanMember extends CleanBasicMember {
    purse: number
    stats: CleanProfileStats
    minions: CleanMinion[]
	fairy_souls: FairySouls
    inventories: Inventories
    objectives: Objective[]
    skills: Skill[]
    visited_zones: Zone[]
    collections: Collection[]
    slayers: SlayerData
}

export interface Bank {
	balance: number
	history: any[]
}

export interface CleanMinion {
    name: string,
    levels: boolean[]
}

export interface CleanProfileStats {
    [ category: string ]: {
        [ stat: string ]: any
        total?: any
    }
}

export interface FairySouls {
	total: number
	/** The number of fairy souls that haven't been exchanged yet */
	unexchanged: number
	exchanges: number
}

export const INVENTORIES = {
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

export type Inventories = { [name in keyof typeof INVENTORIES ]: Inventories }

export interface Objective {
	name: string
	completed: boolean
}

export interface Skill {
	name: string
	xp: number
}

export interface Zone {
	name: string
	visited: boolean
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

export interface Collection {
	name: string
	xp: number
	level: number
	category: CollectionCategory
}

const SLAYER_NAMES = {
	spider: 'tarantula',
	zombie: 'revenant',
	wolf: 'sven'
} as const

type ApiSlayerName = keyof typeof SLAYER_NAMES
type SlayerName = (typeof SLAYER_NAMES)[ApiSlayerName]

interface SlayerTier {
	tier: number,
	kills: number
}

export interface Slayer {
	name: SlayerName
	xp: number
	tiers: SlayerTier[]
}

export interface SlayerData {
	xp: number
	bosses: Slayer[]
}
