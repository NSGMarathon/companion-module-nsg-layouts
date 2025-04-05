import { CompanionActionDefinitions } from '@companion-module/base'
import { NodeCGConnector } from './NodeCGConnector'
import { LAYOUT_BUNDLE_NAME, LAYOUT_FEED_COUNT, NsgBundleMap } from './util'
import { getTeamOption } from './helpers/TalentHelper'
import { ObsConfig } from './types/replicants/obsConfig'
import range from 'lodash/range'

export enum NsgAction {
	Timer = 'timer',
	TimerPause = 'timer_pause',
	TimerReset = 'timer_reset',
	TeamTimer = 'team_timer',
	ForfeitTeam = 'forfeit_team',
	StartTwitchCommercial = 'start_twitch_commercial',
	SeekToNextRun = 'seek_to_next_run',
	SeekToPreviousRun = 'seek_to_previous_run',
	SwitchToIntermission = 'switch_to_intermission',
	SwitchToGameLayout = 'switch_to_game_layout',
	SwitchToScene = 'switch_to_scene',
	PlayInterstitialVideo = 'play_interstitial_video'
}

async function switchScene(socket: NodeCGConnector<NsgBundleMap>, sceneNameGetter: (config: ObsConfig) => string | null | undefined) {
	const obsState = socket.replicants[LAYOUT_BUNDLE_NAME].obsState;
	const obsConfig = socket.replicants[LAYOUT_BUNDLE_NAME].obsConfig
	if (obsConfig == null || obsState == null) return;
	const sceneName = sceneNameGetter(obsConfig);
	if (!obsState.transitionInProgress && obsState.status === 'CONNECTED' && obsState.currentScene !== sceneName) {
		await socket.sendMessage('obs:setCurrentScene', LAYOUT_BUNDLE_NAME, { sceneName });
	}
}

export function getActionDefinitions(socket: NodeCGConnector<NsgBundleMap>): CompanionActionDefinitions {
	const activeTeams = socket.replicants[LAYOUT_BUNDLE_NAME].activeSpeedrun?.teams ?? []

	const teamOption = getTeamOption(activeTeams)

	return {
		...socket.getActions(),
		[NsgAction.Timer]: {
			name: 'Start/Finish/Resume timer',
			options: [
				{
					id: 'behavior',
					type: 'dropdown',
					label: 'Pause/Unpause/Cycle',
					default: 'start',
					choices: [
						{ id: 'start', label: 'Start' },
						{ id: 'finish', label: 'Finish' },
						{ id: 'resume', label: 'Resume' },
						{ id: 'cycle', label: 'Cycle (Finish if running/paused, resume if finished, start if stopped)' },
						{
							id: 'start-finish-excluding-pause',
							label: 'Start/Finish excluding pause (Start if stopped, Finish if running)',
						},
						{ id: 'start-finish', label: 'Start/Finish (Start if stopped, Finish if running/paused)' },
					],
				},
			],
			callback: async (action) => {
				const timerState = socket.replicants[LAYOUT_BUNDLE_NAME].timer?.state
				const behavior = action.options.behavior as string
				const hasOneTeam = socket.replicants[LAYOUT_BUNDLE_NAME].activeSpeedrun?.teams?.length === 1

				if (timerState == null) return

				if (
					['start', 'cycle', 'start-finish-excluding-pause', 'start-finish'].includes(behavior) &&
					timerState === 'STOPPED'
				) {
					await socket.sendMessage('timer:start', LAYOUT_BUNDLE_NAME)
				} else if (
					hasOneTeam &&
					((['finish', 'cycle', 'start-finish'].includes(behavior) && ['RUNNING', 'PAUSED'].includes(timerState)) ||
						(behavior === 'start-finish-excluding-pause' && timerState === 'RUNNING'))
				) {
					await socket.sendMessage('timer:stop', LAYOUT_BUNDLE_NAME)
				} else if (hasOneTeam && (behavior === 'resume' || behavior === 'cycle') && timerState === 'FINISHED') {
					await socket.sendMessage('timer:undoStop', LAYOUT_BUNDLE_NAME)
				}
			},
		},
		[NsgAction.TimerPause]: {
			name: 'Pause/Unpause timer',
			options: [
				{
					id: 'behavior',
					type: 'dropdown',
					label: 'Pause/Unpause/Toggle',
					default: 'toggle',
					choices: [
						{ id: 'toggle', label: 'Toggle' },
						{ id: 'pause', label: 'Pause' },
						{ id: 'unpause', label: 'Unpause' },
					],
				},
			],
			callback: async (action) => {
				const timerState = socket.replicants[LAYOUT_BUNDLE_NAME].timer?.state
				if (action.options.behavior !== 'unpause' && timerState === 'RUNNING') {
					await socket.sendMessage('timer:pause', LAYOUT_BUNDLE_NAME)
				} else if (action.options.behavior !== 'pause' && timerState === 'PAUSED') {
					await socket.sendMessage('timer:start', LAYOUT_BUNDLE_NAME)
				}
			},
		},
		[NsgAction.TimerReset]: {
			name: 'Reset timer',
			options: [],
			callback: async () => {
				await socket.sendMessage('timer:reset', LAYOUT_BUNDLE_NAME)
			},
		},
		[NsgAction.TeamTimer]: {
			name: 'Finish/Resume team timer',
			options: [
				teamOption,
				{
					id: 'behavior',
					type: 'dropdown',
					label: 'Finish/Resume',
					default: 'cycle',
					choices: [
						{ id: 'finish', label: 'Finish' },
						{ id: 'resume', label: 'Resume' },
						{ id: 'cycle', label: 'Cycle (Finish if running, resume if finished)' },
					],
				},
			],
			callback: async (action) => {
				const activeTeam = activeTeams[action.options.team as number]
				if (activeTeam == null) return

				const behavior = action.options.behavior
				const teamResult = socket.replicants[LAYOUT_BUNDLE_NAME].timer?.teamResults[activeTeam.id]
				const timerState = socket.replicants[LAYOUT_BUNDLE_NAME].timer?.state

				if (behavior !== 'finish' && (teamResult != null || timerState === 'FINISHED')) {
					await socket.sendMessage('timer:undoStop', LAYOUT_BUNDLE_NAME, { teamId: activeTeam.id })
				} else if (
					behavior !== 'resume' &&
					teamResult == null &&
					(timerState === 'RUNNING' || timerState === 'PAUSED')
				) {
					await socket.sendMessage('timer:stop', LAYOUT_BUNDLE_NAME, { teamId: activeTeam.id })
				}
			},
		},
		[NsgAction.ForfeitTeam]: {
			name: 'Forfeit team',
			options: [teamOption],
			callback: async (action) => {
				const activeTeam = activeTeams[action.options.team as number]
				if (activeTeam == null) return

				const teamResult = socket.replicants[LAYOUT_BUNDLE_NAME].timer?.teamResults[activeTeam.id]
				const timerState = socket.replicants[LAYOUT_BUNDLE_NAME].timer?.state

				if (timerState != null && teamResult == null && ['RUNNING', 'PAUSED'].includes(timerState)) {
					await socket.sendMessage('timer:stop', LAYOUT_BUNDLE_NAME, { teamId: activeTeam.id, forfeit: true })
				}
			},
		},
		[NsgAction.StartTwitchCommercial]: {
			name: 'Start Twitch commercial',
			options: [
				{
					id: 'length',
					type: 'number',
					label: 'Length',
					min: 30,
					max: 180,
					step: 30,
					default: 90,
					range: true,
				},
			],
			callback: async (action) => {
				await socket.sendMessage('twitch:startCommercial', LAYOUT_BUNDLE_NAME, { length: action.options.length })
			},
		},
		[NsgAction.SeekToNextRun]: {
			name: 'Seek to next run',
			options: [],
			callback: async () => {
				await socket.sendMessage('speedrun:seekToNextRun', LAYOUT_BUNDLE_NAME)
			},
		},
		[NsgAction.SeekToPreviousRun]: {
			name: 'Seek to previous run',
			options: [],
			callback: async () => {
				await socket.sendMessage('speedrun:seekToPreviousRun', LAYOUT_BUNDLE_NAME)
			},
		},
		[NsgAction.SwitchToIntermission]: {
			name: 'Switch to intermission scene',
			options: [],
			callback: async () => {
				await switchScene(socket, config => config.intermissionScene);
			}
		},
		[NsgAction.SwitchToGameLayout]: {
			name: 'Switch to game layout',
			options: [
				{
					id: 'feedIndex',
					type: 'dropdown',
					label: 'Feed',
					default: 0,
					choices: range(LAYOUT_FEED_COUNT).map(i => ({
						id: i,
						label: i === 0 ? 'Main Feed' : `Feed ${i + 1}`
					}))
				}
			],
			callback: async (action) => {
				await switchScene(socket, config => config.gameplayScenes[action.options.feedIndex as number]);
			}
		},
		[NsgAction.SwitchToScene]: {
			name: 'Switch to scene',
			options: [
				{
					id: 'sceneName',
					type: 'dropdown',
					label: 'Scene name',
					default: socket.replicants[LAYOUT_BUNDLE_NAME].obsState?.scenes?.[0] ?? '',
					choices: (socket.replicants[LAYOUT_BUNDLE_NAME].obsState?.scenes ?? []).map(sceneName => ({
						id: sceneName,
						label: sceneName
					}))
				}
			],
			callback: async (action) => {
				await switchScene(socket, () => action.options.sceneName as string | undefined);
			}
		},
		[NsgAction.PlayInterstitialVideo]: {
			name: 'Play interstitial video',
			options: [
				{
					id: 'file',
					type: 'dropdown',
					label: 'Video file',
					default: (socket.replicants[LAYOUT_BUNDLE_NAME].videoFiles?.interstitials ?? [])[0]?.path,
					choices: (socket.replicants[LAYOUT_BUNDLE_NAME].videoFiles?.interstitials ?? []).map(videoFile => ({
						id: videoFile.path,
						label: videoFile.name
					}))
				}
			],
			callback: async (action) => {
				const obsState = socket.replicants[LAYOUT_BUNDLE_NAME].obsState;
				const obsConfig = socket.replicants[LAYOUT_BUNDLE_NAME].obsConfig;
				if (
					obsState == null
					|| obsState.status !== 'CONNECTED'
					|| obsState.transitionInProgress
					|| obsConfig?.intermissionScene == null
					|| obsConfig?.interstitialVideoScene == null
				) return;
				const videoFile = (socket.replicants[LAYOUT_BUNDLE_NAME].videoFiles?.interstitials ?? [])
					.find(video => video.path === action.options.file);
				if (videoFile != null) {
					await socket.sendMessage('videos:playInterstitial', LAYOUT_BUNDLE_NAME, { file: videoFile, returnToScene: 'INTERMISSION' });
				}
			}
		}
	}
}
