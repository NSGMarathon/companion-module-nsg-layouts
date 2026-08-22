import { combineRgb, CompanionFeedbackDefinitions } from '@companion-module/base'
import {
	getTodoListCategoryOptions,
	getTodoListItemOptions,
	LAYOUT_BUNDLE_NAME,
	LAYOUT_FEED_COUNT,
	NsgBundleMap,
	parseTodoListItemOptionId,
	stageDisplayMessageColorOption,
	stageDisplayMessageModeOption,
} from './util'
import { NodeCGConnector } from './NodeCGConnector'
import { CompanionInputFieldDropdown } from '@companion-module/base/dist/module-api/input'
import { getTeamOption } from './helpers/TalentHelper'
import { NsgLayoutsInstance } from './index'
import { ObsConfig } from './types/replicants/obsConfig'
import range from 'lodash/range'
import { DateTime } from 'luxon'

export enum NsgFeedback {
	TimerState = 'timer_state',
	TeamTimerState = 'team_timer_state',
	OneTeamTimerState = 'one_team_timer_state',
	TeamExists = 'team_exists',
	TwitchCommercialsPlaying = 'twitch_commercials_playing',
	TwitchCommercialCooldownInProgress = 'twitch_commercial_cooldown_in_progress',
	TwitchLoginExists = 'twitch_login_exists',
	IntermissionInProgram = 'intermission_in_program',
	GameLayoutInProgram = 'game_layout_in_program',
	SceneInProgram = 'scene_in_program',
	InterstitialVideoPlaying = 'interstitial_video_playing',
	InterstitialVideoLastPlayed = 'interstitial_video_last_played',
	AllTodoItemsCompleted = 'all_todo_items_completed',
	TodoCategoryCompleted = 'todo_category_completed',
	TodoItemCompleted = 'todo_item_completed',
	StageDisplayMessageVisible = 'stage_display_message_visible',
	StageDisplayMessageText = 'stage_display_message_text',
	StageDisplayMessageMode = 'stage_display_message_mode',
	StageDisplayMessageColor = 'stage_display_message_color',
	StageDisplayMode = 'stage_display_mode',
}

function isSceneInProgram(
	socket: NodeCGConnector<NsgBundleMap>,
	sceneNameGetter: (config: ObsConfig) => string | null | undefined
) {
	const obsState = socket.replicants[LAYOUT_BUNDLE_NAME].obsState
	const obsConfig = socket.replicants[LAYOUT_BUNDLE_NAME].obsConfig
	if (obsConfig == null || obsState == null) return false
	const sceneName = sceneNameGetter(obsConfig)
	return obsState.currentScene != null && sceneName != null && obsState.currentScene === sceneName
}

export function getFeedbackDefinitions(
	instance: NsgLayoutsInstance,
	socket: NodeCGConnector<NsgBundleMap>
): CompanionFeedbackDefinitions {
	const timerStateOption: CompanionInputFieldDropdown = {
		id: 'state',
		type: 'dropdown',
		label: 'State',
		default: 'RUNNING',
		choices: [
			{ id: 'RUNNING', label: 'Running' },
			{ id: 'STOPPED', label: 'Stopped' },
			{ id: 'FINISHED', label: 'Finished' },
			{ id: 'PAUSED', label: 'Paused' },
		],
	}
	const teams = socket.replicants[LAYOUT_BUNDLE_NAME].activeSpeedrun?.teams ?? []
	const teamOption = getTeamOption(teams)
	const todoItemOptions = getTodoListItemOptions(socket)
	const todoCategoryOptions = getTodoListCategoryOptions(socket)

	return {
		...socket.getFeedbacks(),
		[NsgFeedback.TimerState]: {
			type: 'boolean',
			name: 'Timer state',
			description: 'Change style if timer state matches',
			defaultStyle: {
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			options: [timerStateOption],
			callback: (feedback) => socket.replicants[LAYOUT_BUNDLE_NAME].timer?.state === feedback.options.state,
		},
		[NsgFeedback.TeamTimerState]: {
			type: 'boolean',
			name: 'Team timer state',
			description: 'Change style if team timer state matches',
			defaultStyle: {
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			options: [
				teamOption,
				{
					id: 'state',
					type: 'dropdown',
					label: 'State',
					default: 'FINISHED',
					choices: [
						{ id: 'FINISHED', label: 'Finished' },
						{ id: 'FORFEIT', label: 'Forfeited' },
						{ id: 'any', label: 'Either' },
					],
				},
			],
			callback: (feedback) => {
				const teamResults = socket.replicants[LAYOUT_BUNDLE_NAME].timer?.teamResults
				if (teamResults == null) return false
				const team = teams[feedback.options.team as number]
				if (team == null) return false
				const teamResult = teamResults[team.id]
				return (feedback.options.state === 'any' && teamResult != null) || teamResult?.state === feedback.options.state
			},
		},
		[NsgFeedback.OneTeamTimerState]: {
			type: 'boolean',
			name: 'Timer state with one team',
			description: 'Change style if timer state matches and only one team is playing',
			defaultStyle: {
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			options: [timerStateOption],
			callback: (feedback) =>
				(socket.replicants[LAYOUT_BUNDLE_NAME].activeSpeedrun?.teams.length ?? 0) === 1 &&
				socket.replicants[LAYOUT_BUNDLE_NAME].timer?.state === feedback.options.state,
		},
		[NsgFeedback.TeamExists]: {
			type: 'boolean',
			name: 'Team exists',
			description: 'Change style if team exists',
			defaultStyle: {
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			options: [teamOption],
			callback: (feedback) =>
				(socket.replicants[LAYOUT_BUNDLE_NAME].activeSpeedrun?.teams.length ?? 0) > (feedback.options.team as number),
		},
		[NsgFeedback.TwitchCommercialsPlaying]: {
			type: 'boolean',
			name: 'Twitch commercials running',
			description: 'Change style if Twitch commercials are running',
			defaultStyle: {
				bgcolor: combineRgb(255, 0, 0),
				color: combineRgb(255, 255, 255),
				size: '14',
				text: `ADS RUNNING $(${instance.label}:twitch_commercial_end_time)`,
			},
			options: [],
			callback: () => instance.twitchCommercialsPlaying,
		},
		[NsgFeedback.TwitchCommercialCooldownInProgress]: {
			type: 'boolean',
			name: 'Twitch commercial cooldown in progress',
			description: 'Change style if Twitch commercials cannot be played yet',
			defaultStyle: {
				bgcolor: combineRgb(255, 255, 0),
				color: combineRgb(0, 0, 0),
				size: '14',
				text: `AD TIMEOUT $(${instance.label}:twitch_commercial_retry_time)`,
			},
			options: [],
			callback: () => !instance.canStartTwitchCommercials,
		},
		[NsgFeedback.TwitchLoginExists]: {
			type: 'boolean',
			name: 'Twitch login exists',
			description: 'Change style if logged in to Twitch',
			defaultStyle: {
				bgcolor: combineRgb(0, 0, 0),
				color: combineRgb(255, 255, 255),
			},
			options: [],
			callback: () => socket.replicants[LAYOUT_BUNDLE_NAME].twitchData?.state !== 'NOT_LOGGED_IN',
		},
		[NsgFeedback.IntermissionInProgram]: {
			type: 'boolean',
			name: 'Intermission in program',
			description: 'Change style if intermission scene is in program',
			defaultStyle: {
				bgcolor: combineRgb(0, 0, 0),
				color: combineRgb(255, 255, 255),
			},
			options: [],
			callback: () => isSceneInProgram(socket, (config) => config.intermissionScene),
		},
		[NsgFeedback.GameLayoutInProgram]: {
			type: 'boolean',
			name: 'Game layout in program',
			description: 'Change style if game layout scene is in program',
			defaultStyle: {
				bgcolor: combineRgb(0, 0, 0),
				color: combineRgb(255, 255, 255),
			},
			options: [
				{
					id: 'feedIndex',
					type: 'dropdown',
					label: 'Feed',
					default: 0,
					choices: range(LAYOUT_FEED_COUNT).map((i) => ({
						id: i,
						label: i === 0 ? 'Main Feed' : `Feed ${i + 1}`,
					})),
				},
			],
			callback: (feedback) =>
				isSceneInProgram(socket, (config) => config.gameplayScenes[feedback.options.feedIndex as number]),
		},
		[NsgFeedback.SceneInProgram]: {
			type: 'boolean',
			name: 'Scene in program',
			description: 'Change style if scene is in program',
			defaultStyle: {
				bgcolor: combineRgb(0, 0, 0),
				color: combineRgb(255, 255, 255),
			},
			options: [
				{
					id: 'sceneName',
					type: 'dropdown',
					label: 'Scene name',
					default: socket.replicants[LAYOUT_BUNDLE_NAME].obsState?.scenes?.[0] ?? '',
					choices: (socket.replicants[LAYOUT_BUNDLE_NAME].obsState?.scenes ?? []).map((sceneName) => ({
						id: sceneName,
						label: sceneName,
					})),
				},
			],
			callback: (feedback) => isSceneInProgram(socket, () => feedback.options.sceneName as string | undefined),
		},
		[NsgFeedback.InterstitialVideoPlaying]: {
			type: 'boolean',
			name: 'Interstitial video playing',
			defaultStyle: {
				bgcolor: combineRgb(0, 255, 0),
				color: combineRgb(0, 0, 0),
			},
			options: [],
			callback: () => socket.replicants[LAYOUT_BUNDLE_NAME].interstitialVideoState?.isRunning ?? false,
		},
		[NsgFeedback.InterstitialVideoLastPlayed]: {
			type: 'boolean',
			name: 'Interstitial video last played',
			description: 'Change style if interstitial video has or has not been played for a certain period of time',
			defaultStyle: {
				bgcolor: combineRgb(0, 0, 0),
				color: combineRgb(255, 255, 255),
			},
			options: [
				{
					id: 'file',
					type: 'dropdown',
					label: 'Video file',
					default: (socket.replicants[LAYOUT_BUNDLE_NAME].videoFiles?.interstitials ?? [])[0]?.path,
					choices: (socket.replicants[LAYOUT_BUNDLE_NAME].videoFiles?.interstitials ?? []).map((videoFile) => ({
						id: videoFile.path,
						label: videoFile.name,
					})),
				},
				{
					id: 'operation',
					type: 'dropdown',
					label: 'Operation',
					default: 'gt',
					choices: [
						{ id: 'gt', label: '>' },
						{ id: 'lt', label: '<' },
					],
				},
				{
					id: 'amount',
					type: 'number',
					label: 'Amount (min.)',
					default: 60,
					min: 1,
					max: 10080,
				},
			],
			callback: (action) => {
				const videoFile = (socket.replicants[LAYOUT_BUNDLE_NAME].videoFiles?.interstitials ?? []).find(
					(video) => video.path === action.options.file
				)
				if (videoFile == null || videoFile.lastPlayed == null) return false
				const lastPlayedDiff = DateTime.fromISO(videoFile.lastPlayed).diffNow('minutes').minutes * -1
				if (action.options.operation === 'gt') {
					return lastPlayedDiff > (action.options.amount as number)
				} else {
					return lastPlayedDiff < (action.options.amount as number)
				}
			},
		},
		[NsgFeedback.AllTodoItemsCompleted]: {
			type: 'boolean',
			name: 'All todo list items completed',
			description: 'Change style if tech setup has been completed',
			defaultStyle: {
				color: combineRgb(0, 0, 0),
				bgcolor: combineRgb(0, 255, 0),
			},
			options: [],
			callback: () => {
				return (
					socket.replicants[LAYOUT_BUNDLE_NAME].todoList?.techSetup.every((category) =>
						category.items.every((item) => item.completed)
					) ?? false
				)
			},
		},
		[NsgFeedback.TodoCategoryCompleted]: {
			type: 'boolean',
			name: 'Todo list category completed',
			description: 'Change style if todo list category is completed',
			defaultStyle: {
				color: combineRgb(0, 0, 0),
				bgcolor: combineRgb(0, 255, 0),
			},
			options: [todoCategoryOptions],
			callback: (action) => {
				return (
					socket.replicants[LAYOUT_BUNDLE_NAME].todoList?.techSetup
						.find((category) => category.name === action.options.todoCategory)
						?.items.every((item) => item.completed) ?? false
				)
			},
		},
		[NsgFeedback.TodoItemCompleted]: {
			type: 'boolean',
			name: 'Todo list item completed',
			description: 'Change style if todo list item is completed',
			defaultStyle: {
				color: combineRgb(0, 0, 0),
				bgcolor: combineRgb(0, 255, 0),
			},
			options: [todoItemOptions],
			callback: (action) => {
				const todoItem = parseTodoListItemOptionId(action.options.todoItem as string)

				return (
					socket.replicants[LAYOUT_BUNDLE_NAME].todoList?.techSetup
						.find((category) => category.name === todoItem.categoryName)
						?.items.find((item) => item.name === todoItem.itemName)?.completed ?? false
				)
			},
		},
		[NsgFeedback.StageDisplayMessageVisible]: {
			type: 'boolean',
			name: 'Stage display message visible',
			defaultStyle: {
				color: combineRgb(0, 0, 0),
				bgcolor: combineRgb(0, 255, 0),
			},
			options: [],
			callback: () => socket.replicants[LAYOUT_BUNDLE_NAME].stageDisplayState?.message.visible ?? false
		},
		[NsgFeedback.StageDisplayMessageText]: {
			type: 'boolean',
			name: 'Stage display message text equals',
			defaultStyle: {
				color: combineRgb(0, 0, 0),
				bgcolor: combineRgb(0, 255, 0),
			},
			options: [
				{
					id: 'text',
					type: 'textinput',
					label: 'Text',
					default: ''
				}
			],
			callback: (action) => socket.replicants[LAYOUT_BUNDLE_NAME].stageDisplayState?.message.text?.toLowerCase() === (action.options.text as string).toLowerCase()
		},
		[NsgFeedback.StageDisplayMessageMode]: {
			type: 'boolean',
			name: 'Stage display message mode equals',
			defaultStyle: {
				color: combineRgb(0, 0, 0),
				bgcolor: combineRgb(0, 255, 0),
			},
			options: [
				stageDisplayMessageModeOption
			],
			callback: (action) => socket.replicants[LAYOUT_BUNDLE_NAME].stageDisplayState?.message.mode === action.options.mode
		},
		[NsgFeedback.StageDisplayMessageColor]: {
			type: 'boolean',
			name: 'Stage display message color equals',
			defaultStyle: {
				color: combineRgb(0, 0, 0),
				bgcolor: combineRgb(0, 255, 0),
			},
			options: [
				stageDisplayMessageColorOption
			],
			callback: (action) => socket.replicants[LAYOUT_BUNDLE_NAME].stageDisplayState?.message.color === action.options.color
		},
		[NsgFeedback.StageDisplayMode]: {
			type: 'boolean',
			name: 'Stage display mode equals',
			defaultStyle: {
				color: combineRgb(0, 0, 0),
				bgcolor: combineRgb(0, 255, 0),
			},
			options: [
				{
					id: 'mode',
					label: 'Mode',
					type: 'dropdown',
					default: 'PREVIEW',
					choices: [
						{ id: 'PREVIEW', label: 'Preview' },
						{ id: 'PROGRAM', label: 'Program' },
					]
				}
			],
			callback: (action) => socket.replicants[LAYOUT_BUNDLE_NAME].stageDisplayState?.mode === action.options.mode
		},
	}
}
