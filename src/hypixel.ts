import fetch from 'node-fetch'
import { Agent } from 'https'

if (!process.env.key)
	// if there's no key in env, run dotenv
	require('dotenv').config()

const baseApi = 'https://skyblock-api2.matdoes.dev' // TODO: change this to skyblock-api.matdoes.dev once it replaces the old one

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

