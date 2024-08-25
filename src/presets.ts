import { combineRgb, CompanionPresetDefinitions, CompanionPresetFeedback } from '@companion-module/base'
import { NsgFeedback } from './feedbacks'
import { NsgAction } from './actions'
import { NodeCGConnector } from './NodeCGConnector'
import { LAYOUT_BUNDLE_NAME, NsgBundleMap } from './util'

export function getPresetDefinitions(socket: NodeCGConnector<NsgBundleMap>): CompanionPresetDefinitions {
	const timerDisplayFeedbacks: CompanionPresetFeedback[] = [
		{
			feedbackId: NsgFeedback.TimerState,
			options: {
				state: 'PAUSED',
			},
			style: {
				color: combineRgb(255, 255, 0),
			},
		},
		{
			feedbackId: NsgFeedback.TimerState,
			options: {
				state: 'FINISHED',
			},
			style: {
				color: combineRgb(0, 255, 0),
			},
		},
	]

	const teams = socket.replicants[LAYOUT_BUNDLE_NAME].activeSpeedrun?.teams ?? []
	const teamTimerFinishResumePresets = Array.from({ length: Math.max(4, teams.length) }, (_, i) => i).reduce(
		(result, index) => {
			result[`team_${index + 1}_finish_resume`] = {
				type: 'button',
				category: 'Finish/Resume team',
				name: `Finish/Resume team ${index + 1}`,
				style: {
					text: `TEAM ${index + 1}`,
					size: '18',
					color: combineRgb(37, 37, 37),
					bgcolor: combineRgb(0, 0, 0),
				},
				feedbacks: [
					// If no other conditions are met but the team exists, the timer must be running
					{
						feedbackId: NsgFeedback.TeamExists,
						options: {
							team: index,
						},
						style: {
							text: `$(nsg:team_name_${index + 1})\nFINISH`,
							size: 'auto',
							color: combineRgb(0, 0, 0),
							bgcolor: combineRgb(0, 255, 0),
						},
					},
					// If team's timer is finished, prompt to resume
					{
						feedbackId: NsgFeedback.TeamTimerState,
						options: {
							team: index,
							state: 'any',
						},
						style: {
							text: `$(nsg:team_name_${index + 1})\nRESUME`,
							size: 'auto',
							color: combineRgb(0, 0, 0),
							bgcolor: combineRgb(255, 255, 0),
						},
					},
					// If timer is stopped, just show the team's name
					{
						feedbackId: NsgFeedback.TimerState,
						options: {
							state: 'STOPPED',
						},
						style: {
							text: `TEAM ${index + 1}\n$(nsg:team_name_${index + 1})`,
							size: 'auto',
							color: combineRgb(255, 255, 255),
							bgcolor: combineRgb(0, 0, 0),
						},
					},
					// If team doesn't exist, reduce emphasis on the text
					{
						feedbackId: NsgFeedback.TeamExists,
						isInverted: true,
						options: {
							team: index,
						},
						style: {
							text: `TEAM ${index + 1}`,
							color: combineRgb(37, 37, 37),
							bgcolor: combineRgb(0, 0, 0),
							size: '18',
						},
					},
				],
				steps: [
					{
						down: [
							{
								actionId: NsgAction.TeamTimer,
								options: {
									team: index,
									behavior: 'cycle',
								},
							},
						],
						up: [],
					},
				],
			}
			return result
		},
		{} as CompanionPresetDefinitions
	)
	const teamTimerResultForfeitPresets = Array.from({ length: Math.max(4, teams.length) }, (_, i) => i).reduce(
		(result, index) => {
			result[`team_${index + 1}_result_forfeit`] = {
				type: 'button',
				category: 'Forfeit team or show team result',
				name: `Forfeit/Result for team ${index + 1}`,
				style: {
					text: `TEAM ${index + 1}`,
					size: '18',
					color: combineRgb(37, 37, 37),
					bgcolor: combineRgb(0, 0, 0),
					show_topbar: false,
				},
				feedbacks: [
					// If no other conditions are met but the team exists, the timer must be running
					{
						feedbackId: NsgFeedback.TeamExists,
						options: {
							team: index,
						},
						style: {
							text: 'FORFEIT',
							size: '14',
							color: combineRgb(255, 255, 255),
							bgcolor: combineRgb(255, 0, 0),
						},
					},
					// If team's timer is finished or forfeit, show result
					{
						feedbackId: NsgFeedback.TeamTimerState,
						options: {
							team: index,
							state: 'FINISHED',
						},
						style: {
							text: `DONE\n$(nsg:team_result_${index + 1})`,
							size: '14',
							color: combineRgb(0, 0, 0),
							bgcolor: combineRgb(0, 255, 0),
						},
					},
					{
						feedbackId: NsgFeedback.TeamTimerState,
						options: {
							team: index,
							state: 'FORFEIT',
						},
						style: {
							text: `FORFEIT\n$(nsg:team_result_${index + 1})`,
							size: '14',
							color: combineRgb(255, 255, 255),
							bgcolor: combineRgb(255, 0, 0),
						},
					},
					// If timer is stopped, reduce emphasis on the text
					{
						feedbackId: NsgFeedback.TimerState,
						options: {
							state: 'STOPPED',
						},
						style: {
							color: combineRgb(37, 37, 37),
							bgcolor: combineRgb(0, 0, 0),
						},
					},
				],
				steps: [
					{
						down: [
							{
								actionId: NsgAction.ForfeitTeam,
								options: {
									team: index,
								},
							},
						],
						up: [],
					},
				],
			}
			return result
		},
		{} as CompanionPresetDefinitions
	)

	return {
		...teamTimerFinishResumePresets,
		...teamTimerResultForfeitPresets,

		main_timer_start_stop_resume: {
			type: 'button',
			category: 'Timer',
			name: 'Main timer Start/Stop/Resume',
			style: {
				text: 'MAIN TIMER',
				size: '14',
				color: combineRgb(37, 37, 37),
				bgcolor: combineRgb(0, 0, 0),
			},
			feedbacks: [
				{
					feedbackId: NsgFeedback.OneTeamTimerState,
					options: {
						state: 'FINISHED',
					},
					style: {
						text: 'RESUME',
						size: '14',
						color: combineRgb(0, 0, 0),
						bgcolor: combineRgb(255, 255, 0),
					},
				},
				{
					feedbackId: NsgFeedback.OneTeamTimerState,
					options: {
						state: 'RUNNING',
					},
					style: {
						text: 'FINISH',
						size: '14',
						color: combineRgb(0, 0, 0),
						bgcolor: combineRgb(0, 255, 0),
					},
				},
				{
					feedbackId: NsgFeedback.OneTeamTimerState,
					options: {
						state: 'PAUSED',
					},
					style: {
						text: 'FINISH',
						size: '14',
						color: combineRgb(0, 0, 0),
						bgcolor: combineRgb(0, 255, 0),
					},
				},
				{
					feedbackId: NsgFeedback.TimerState,
					options: {
						state: 'STOPPED',
					},
					style: {
						text: 'START TIMER',
						size: '14',
						color: combineRgb(0, 0, 0),
						bgcolor: combineRgb(0, 255, 0),
					},
				},
			],
			steps: [
				{
					down: [
						{
							actionId: NsgAction.Timer,
							options: {
								behavior: 'cycle',
							},
						},
					],
					up: [],
				},
			],
		},
		main_timer_start_stop_excluding_pause: {
			type: 'button',
			category: 'Timer',
			name: 'Main timer Start/Stop excluding pause',
			style: {
				text: 'MAIN TIMER',
				size: '14',
				color: combineRgb(37, 37, 37),
				bgcolor: combineRgb(0, 0, 0),
			},
			feedbacks: [
				{
					feedbackId: NsgFeedback.OneTeamTimerState,
					options: {
						state: 'RUNNING',
					},
					style: {
						text: 'FINISH',
						size: '14',
						color: combineRgb(0, 0, 0),
						bgcolor: combineRgb(0, 255, 0),
					},
				},
				{
					feedbackId: NsgFeedback.TimerState,
					options: {
						state: 'STOPPED',
					},
					style: {
						text: 'START TIMER',
						size: '14',
						color: combineRgb(0, 0, 0),
						bgcolor: combineRgb(0, 255, 0),
					},
				},
			],
			steps: [
				{
					down: [
						{
							actionId: NsgAction.Timer,
							options: {
								behavior: 'start-finish-excluding-pause',
							},
						},
					],
					up: [],
				},
			],
		},
		main_timer_start_stop: {
			type: 'button',
			category: 'Timer',
			name: 'Main timer Start/Stop',
			style: {
				text: 'MAIN TIMER',
				size: '14',
				color: combineRgb(37, 37, 37),
				bgcolor: combineRgb(0, 0, 0),
			},
			feedbacks: [
				{
					feedbackId: NsgFeedback.OneTeamTimerState,
					options: {
						state: 'RUNNING',
					},
					style: {
						text: 'FINISH',
						size: '14',
						color: combineRgb(0, 0, 0),
						bgcolor: combineRgb(0, 255, 0),
					},
				},
				{
					feedbackId: NsgFeedback.OneTeamTimerState,
					options: {
						state: 'PAUSED',
					},
					style: {
						text: 'FINISH',
						size: '14',
						color: combineRgb(0, 0, 0),
						bgcolor: combineRgb(0, 255, 0),
					},
				},
				{
					feedbackId: NsgFeedback.TimerState,
					options: {
						state: 'STOPPED',
					},
					style: {
						text: 'START TIMER',
						size: '14',
						color: combineRgb(0, 0, 0),
						bgcolor: combineRgb(0, 255, 0),
					},
				},
			],
			steps: [
				{
					down: [
						{
							actionId: NsgAction.Timer,
							options: {
								behavior: 'start-finish',
							},
						},
					],
					up: [],
				},
			],
		},
		pause_unpause_timer: {
			type: 'button',
			category: 'Timer',
			name: 'Main timer Pause/Unpause',
			style: {
				text: 'PAUSE TIMER',
				size: '14',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			feedbacks: [
				{
					feedbackId: NsgFeedback.TimerState,
					options: {
						state: 'PAUSED',
					},
					style: {
						text: 'UNPAUSE TIMER',
						size: '14',
					},
				},
				{
					feedbackId: NsgFeedback.TimerState,
					options: {
						state: 'FINISHED',
					},
					style: {
						color: combineRgb(37, 37, 37),
					},
				},
			],
			steps: [
				{
					down: [
						{
							actionId: NsgAction.TimerPause,
							options: {
								behavior: 'toggle',
							},
						},
					],
					up: [],
				},
			],
		},
		small_timer: {
			type: 'button',
			category: 'Timer',
			name: 'Small timer display',
			style: {
				text: '$(nsg:timer_hours):$(nsg:timer_minutes):$(nsg:timer_seconds)',
				size: '18',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			feedbacks: timerDisplayFeedbacks,
			steps: [],
		},
		large_timer_hours: {
			type: 'button',
			category: 'Timer',
			name: 'Hours display',
			style: {
				text: 'HRS\n$(nsg:timer_hours)',
				size: '24',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			feedbacks: timerDisplayFeedbacks,
			steps: [],
		},
		large_timer_minutes: {
			type: 'button',
			category: 'Timer',
			name: 'Minutes display',
			style: {
				text: 'MINS\n$(nsg:timer_minutes)',
				size: '24',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			feedbacks: timerDisplayFeedbacks,
			steps: [],
		},
		large_timer_seconds: {
			type: 'button',
			category: 'Timer',
			name: 'Seconds display',
			style: {
				text: 'SEC\n$(nsg:timer_seconds)',
				size: '24',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			feedbacks: timerDisplayFeedbacks,
			steps: [],
		},
	}
}
