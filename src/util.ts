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
import {
	CompanionInputFieldDropdown,
	DropdownChoice,
	DropdownChoiceId
} from '@companion-module/base/dist/module-api/input'
import { StageDisplayState } from './types/replicants/stageDisplayState'
import { FeudBoard } from './types/replicants/feudBoard'
import { FeudState } from './types/replicants/feudState'
import { FeudTeamInfo } from './types/replicants/feudTeamInfo'
import { FeudLowerThirdMode } from './types/replicants/feudLowerThirdMode'

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
	feudBoard?: FeudBoard
	feudState?: FeudState
	feudTeamInfo?: FeudTeamInfo
	feudLowerThirdMode?: FeudLowerThirdMode
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

export function getFeudAnswerOption(socket: NodeCGConnector<NsgBundleMap>): CompanionInputFieldDropdown {
	const board = socket.replicants[LAYOUT_BUNDLE_NAME].feudBoard?.answers ?? []

	return {
		id: 'answer',
		type: 'dropdown',
		label: 'Answer',
		default: 0,
		choices: Array.from({ length: 8 }, (_, i) => ({ id: i, label: `#${i + 1} - ${board[i]?.answer ?? '(empty)'}` })),
	}
}

export function getReturnToSceneOptions(socket: NodeCGConnector<NsgBundleMap>): CompanionInputFieldDropdown {
	const obsConfig = socket.replicants[LAYOUT_BUNDLE_NAME].obsConfig
	const obsState = socket.replicants[LAYOUT_BUNDLE_NAME].obsState

	const choices: DropdownChoice[] = obsConfig == null || obsState == null ? [] : (obsState?.scenes ?? [])
		.filter((scene) =>
			// Handled below
			scene !== obsConfig.intermissionScene
			// "utility scenes" that should never be switched to
			&& scene !== obsConfig.videoInputsScene
			&& scene !== obsConfig.interstitialVideoScene
			&& !obsConfig.gameLayoutVideoFeedScenes.includes(scene)
		)
		.sort((a, b) => {
			// there _has_ to be a better way of doing this, right?
			if (a === obsConfig.intermissionScene) {
				return -1;
			} else if (b === obsConfig.intermissionScene) {
				return 1;
			}

			if (a === obsState.currentScene) {
				return -1;
			} else if (b === obsState.currentScene) {
				return 1;
			}

			if (a === obsState.previewScene) {
				return -1;
			} else if (b === obsState.previewScene) {
				return 1;
			}

			return a.localeCompare(b);
		})
		.map((scene) => ({ label: scene, id: scene }))

	choices.unshift(
		{ id: 0, label: 'Intermission scene' },
		{ id: 1, label: 'Program scene (at time of activation)' },
		{ id: 2, label: 'Preview scene (at time of activation)' })

	return {
		id: 'returnToScene',
		label: 'After video, return to...',
		type: 'dropdown',
		default: choices[0].id,
		choices,
	}
}

export function parseReturnToScene(socket: NodeCGConnector<NsgBundleMap>, optionId: DropdownChoiceId) {
	if (optionId === 0) {
		return socket.replicants[LAYOUT_BUNDLE_NAME].obsConfig?.intermissionScene ?? null;
	} else if (optionId === 1 || optionId === 2) {
		return socket.replicants[LAYOUT_BUNDLE_NAME].obsState?.[optionId === 1 ? 'currentScene' : 'previewScene'] ?? null;
	}

	return optionId;
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

export const feudLowerThirdModeOption: CompanionInputFieldDropdown = {
	id: 'mode',
	label: 'Mode',
	type: 'dropdown',
	default: 'HIDDEN',
	choices: [
		{ id: 'HIDDEN', label: 'Hidden' },
		{ id: 'TEAM_A', label: 'Team 1' },
		{ id: 'TEAM_B', label: 'Team 2' },
		{ id: 'BOTH_TEAMS', label: 'Both teams' }
	]
}
