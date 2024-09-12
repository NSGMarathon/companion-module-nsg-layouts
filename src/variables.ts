import { NodeCGConnector } from './NodeCGConnector'
import { LAYOUT_BUNDLE_NAME, NsgBundleMap } from './util'
import { CompanionVariableDefinition } from '@companion-module/base'

export function getVariableDefinitions(socket: NodeCGConnector<NsgBundleMap>): CompanionVariableDefinition[] {
	const result = [
		{ variableId: 'active_run_name', name: "The current speedrun's name" },
		{ variableId: 'active_run_category', name: "The current speedrun's category" },
		{ variableId: 'active_run_estimate', name: "The current speedrun's estimate" },
		{ variableId: 'active_run_index', name: "The current speedrun's order out of all speedruns" },
		{ variableId: 'next_run_name', name: "The next speedrun's name" },
		{ variableId: 'next_run_category', name: "The next speedrun's category" },
		{ variableId: 'next_run_estimate', name: "The next speedrun's estimate" },
		{ variableId: 'next_run_index', name: "The next speedrun's order out of all speedruns" },
		{ variableId: 'speedrun_count', name: 'Number of speedruns' },
		{ variableId: 'team_count', name: 'Number of teams in current speedrun' },
		{ variableId: 'timer_state', name: 'Timer state' },
		{ variableId: 'timer_hours', name: 'Timer hours' },
		{ variableId: 'timer_minutes', name: 'Timer minutes' },
		{ variableId: 'timer_seconds', name: 'Timer seconds' },
		{ variableId: 'timer_raw', name: 'Milliseconds since timer start' },
		{ variableId: 'donation_total', name: 'Total amount donated' },
		{ variableId: 'donation_total_raw', name: 'Total amount donated as an unformatted number' },
		{ variableId: 'twitch_commercial_retry_time', name: 'Time until a new Twitch commercial may be played' },
		{ variableId: 'twitch_commercial_end_time', name: 'Time until the current Twitch commercial ends' },
	]

	const teams = socket.replicants[LAYOUT_BUNDLE_NAME].activeSpeedrun?.teams ?? []
	result.push(
		...Array.from({ length: Math.max(4, teams.length) }, (_, i) => i).flatMap((i) => [
			{
				variableId: `team_name_${i + 1}`,
				name: `Name of team #${i + 1}`,
			},
			{
				variableId: `team_result_${i + 1}`,
				name: `Final time of team #${i + 1}`,
			},
		])
	)

	return result
}
