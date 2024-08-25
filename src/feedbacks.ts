import { combineRgb, CompanionFeedbackDefinitions } from '@companion-module/base'
import { LAYOUT_BUNDLE_NAME, NsgBundleMap } from './util'
import { NodeCGConnector } from './NodeCGConnector'
import { CompanionInputFieldDropdown } from '@companion-module/base/dist/module-api/input'
import { getTeamOption } from './helpers/TalentHelper'

export enum NsgFeedback {
	TimerState = 'timer_state',
	TeamTimerState = 'team_timer_state',
	OneTeamTimerState = 'one_team_timer_state',
	TeamExists = 'team_exists',
}

export function getFeedbackDefinitions(socket: NodeCGConnector<NsgBundleMap>): CompanionFeedbackDefinitions {
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
				return feedback.options.state === 'any' && teamResult != null || teamResult?.state === feedback.options.state
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
			callback: (feedback) => (socket.replicants[LAYOUT_BUNDLE_NAME].activeSpeedrun?.teams.length ?? 0) > (feedback.options.team as number)
		}
	}
}
