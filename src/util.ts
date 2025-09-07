import { ActiveSpeedrun } from './types/replicants/activeSpeedrun'
import { DonationTotal } from './types/replicants/donationTotal'
import { NextSpeedrun } from './types/replicants/nextSpeedrun'
import { Schedule } from './types/replicants/schedule'
import { Talent } from './types/replicants/talent'
import { Timer } from './types/replicants/timer'
import { TwitchCommercialState } from './types/replicants/twitchCommercialState'
import { TwitchData } from './types/replicants/twitchData'
import { ObsConfig } from './types/replicants/obsConfig'
import { ObsState } from './types/replicants/obsState'
import { VideoFiles } from './types/replicants/videoFiles'
import { InterstitialVideoState } from './types/replicants/interstitialVideoState'
import { TodoList } from './types/replicants/todoList'
import { NodeCGConnector } from './NodeCGConnector'
import { CompanionInputFieldDropdown, DropdownChoice } from '@companion-module/base/dist/module-api/input'
import { StageDisplayState } from './types/replicants/stageDisplayState'

export const LAYOUT_BUNDLE_NAME = 'nsg2-layouts'
export const LAYOUT_FEED_COUNT = 3

export type NsgBundleMap = {
	[LAYOUT_BUNDLE_NAME]: NsgLayoutsReplicantMap
}

export interface NsgLayoutsReplicantMap {
	activeSpeedrun?: ActiveSpeedrun
	nextSpeedrun?: NextSpeedrun
	donationTotal?: DonationTotal
	schedule?: Schedule
	talent?: Talent
	timer?: Timer
	twitchCommercialState?: TwitchCommercialState
	twitchData?: TwitchData
	obsConfig?: ObsConfig
	obsState?: ObsState
	videoFiles?: VideoFiles
	interstitialVideoState?: InterstitialVideoState
	todoList?: TodoList
	stageDisplayState?: StageDisplayState
}

export function getTodoListCategoryOptions(socket: NodeCGConnector<NsgBundleMap>): CompanionInputFieldDropdown {
	const categories = socket.replicants[LAYOUT_BUNDLE_NAME].todoList?.techSetup ?? []

	return {
		id: 'todoCategory',
		type: 'dropdown',
		label: 'Category',
		default: categories.length === 0 ? '' : categories[0].name,
		choices: categories.map((category) => ({
			id: category.name,
			label: category.name,
		})),
	}
}

export function getTodoListItemOptions(socket: NodeCGConnector<NsgBundleMap>): CompanionInputFieldDropdown {
	const categories = socket.replicants[LAYOUT_BUNDLE_NAME].todoList?.techSetup ?? []

	return {
		id: 'todoItem',
		type: 'dropdown',
		label: 'Item',
		default:
			categories.length === 0 ? '' : categories.find((category) => category.items.length > 0)?.items[0].name ?? '',
		choices: categories.reduce((result, category) => {
			return result.concat(
				category.items.map((item) => ({
					id: buildTodoListItemOptionId(category.name, item.name),
					label: `${category.name} - ${item.name}`,
				}))
			)
		}, [] as DropdownChoice[]),
	}
}

export function buildTodoListItemOptionId(categoryName: string, itemName: string): string {
	return `${categoryName}\n${itemName}`
}

export function parseTodoListItemOptionId(id: string): { categoryName: string; itemName: string } {
	const splitId = id.split('\n')
	if (splitId.length !== 2) {
		throw new Error(`Error parsing todo list item option id "${id}"`)
	}

	return {
		categoryName: splitId[0],
		itemName: splitId[1],
	}
}

export const stageDisplayMessageModeOption: CompanionInputFieldDropdown = {
	id: 'mode',
	label: 'Mode',
	type: 'dropdown',
	default: 'QUICK',
	choices: [
		{ id: 'QUICK', label: 'Quick' },
		{ id: 'GENTLE', label: 'Gentle' }
	]
}

export const stageDisplayMessageColorOption: CompanionInputFieldDropdown = {
	id: 'color',
	label: 'Color',
	type: 'dropdown',
	default: 'YELLOW',
	choices: [
		{ id: 'YELLOW', label: 'Yellow' },
		{ id: 'RED', label: 'Red' },
		{ id: 'GRAY', label: 'Gray' }
	]
}
