import { CompanionActionDefinitions } from '@companion-module/base'
import { NodeCGConnector } from './NodeCGConnector'
import { LAYOUT_BUNDLE_NAME, NsgBundleMap } from './util'
import { getTeamOption } from './helpers/TalentHelper'

export enum NsgAction {
	Timer = 'timer',
	TimerPause = 'timer_pause',
	TimerReset = 'timer_reset',
	TeamTimer = 'team_timer',
	ForfeitTeam = 'forfeit_team',
	StartTwitchCommercial = 'start_twitch_commercial',
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
	}
}
