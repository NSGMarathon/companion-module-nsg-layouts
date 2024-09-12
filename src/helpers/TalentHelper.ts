import { prettyPrintList } from './StringHelper'
import { Talent } from '../types/replicants/talent'
import { CompanionInputFieldDropdown } from '@companion-module/base/dist/module-api/input'
import { Speedrun } from '../types/replicants/schedule'

export function formatTalentIdList(talent: Talent, talentIds: { id: string }[], maxItems = 4) {
	const slicedTalentIds = talentIds.slice(0, maxItems)
	const nameList = slicedTalentIds
		.map((talentId) => talent.find((talentItem) => talentItem.id === talentId.id)?.name)
		.filter((talentName) => talentName != null) as string[]
	if (talentIds.length !== slicedTalentIds.length) {
		nameList.push(talentIds.length === maxItems + 1 ? '1 other' : `${talentIds.length - maxItems} others`)
	}
	return prettyPrintList(nameList)
}

export function getTeamOption(teams: Speedrun['teams']): CompanionInputFieldDropdown {
	return {
		id: 'team',
		type: 'dropdown',
		label: 'Team',
		default: 0,
		choices: Array.from({ length: Math.max(4, teams.length) }, (_, i) => ({ id: i, label: `Team ${i + 1}` })),
	}
}

export function formatSpeedrunTeamList(talent: Talent, teams: { playerIds: { id: string }[] }[]) {
	const playerCount = teams.reduce((result, team) => {
		result += team.playerIds.length;
		return result;
	}, 0);

	if (playerCount === 0) {
		return 'No players?!';
	} else if (playerCount >= 6) {
		return `${playerCount} players`;
	}

	return teams.reduce((result, team, index, array) => {
		result += prettyPrintList(team.playerIds.map(playerId =>
			talent.find((talentItem) => talentItem.id === playerId.id)?.name ?? `Unknown Talent ${playerId.id}`));
		if (index !== array.length - 1) {
			result += ' vs. ';
		}
		return result;
	}, '');
}
