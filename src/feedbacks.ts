import { combineRgb, CompanionFeedbackDefinitions } from '@companion-module/base'
import { LAYOUT_BUNDLE_NAME, NsgBundleMap } from './util'
import { NodeCGConnector } from './NodeCGConnector'
import { CompanionInputFieldDropdown } from '@companion-module/base/dist/module-api/input'
import { getTeamOption } from './helpers/TalentHelper'
import { NsgLayoutsInstance } from './index'

export enum NsgFeedback {
	TimerState = 'timer_state',
	TeamTimerState = 'team_timer_state',
	OneTeamTimerState = 'one_team_timer_state',
	TeamExists = 'team_exists',
	TwitchCommercialsPlaying = 'twitch_commercials_playing',
	TwitchCommercialCooldownInProgress = 'twitch_commercial_cooldown_in_progress',
	TwitchLoginExists = 'twitch_login_exists',
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
	}
}
