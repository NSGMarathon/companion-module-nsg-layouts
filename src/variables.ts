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
		{ variableId: 'next_run_players', name: "The next speedrun's players" },
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
		{ variableId: 'feud_team_a_name', name: 'Name of the first Feud team' },
		{ variableId: 'feud_team_a_score', name: 'Score of the first Feud team' },
		{ variableId: 'feud_team_b_name', name: 'Name of the second Feud team' },
		{ variableId: 'feud_team_b_score', name: 'Score of the second Feud team' },
		{ variableId: 'interstitial_time_remaining', name: 'Time remaining in interstitial video' },
	]

	for (let i = 1; i <= 8; i++) {
		result.push(
			{ variableId: `feud_answer_${i}`, name: `Feud answer #${i}` },
			{ variableId: `feud_answer_value_${i}`, name: `Value of Feud answer #${i}` },
		)
	}

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

	const interstitialVideos = socket.replicants[LAYOUT_BUNDLE_NAME].videoFiles?.interstitials ?? []
	result.push(
		...interstitialVideos.map((video) => ({
			variableId: `interstitial_last_played_${video.name.replaceAll(' ', '_')}`,
			name: `How long ago the interstitial "${video.name}" was played`,
		}))
	)

	return result
}
