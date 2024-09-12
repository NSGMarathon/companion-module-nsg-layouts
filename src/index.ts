import { InstanceBase, runEntrypoint, SomeCompanionConfigField } from '@companion-module/base'
import { NodeCGConnector } from './NodeCGConnector'
import { getActionDefinitions } from './actions'
import { getFeedbackDefinitions, NsgFeedback } from './feedbacks'
import { getConfigFields } from './config'
import { LAYOUT_BUNDLE_NAME, NsgBundleMap, NsgLayoutsReplicantMap } from './util'
import { Timer } from './types/replicants/timer'
import throttle from 'lodash/throttle'
import { getPresetDefinitions } from './presets'
import { getVariableDefinitions } from './variables'
import { CompanionVariableValue } from '@companion-module/base/dist/module-api/variable'
import { formatCurrencyAmount, isBlank } from './helpers/StringHelper'
import { formatSpeedrunTeamList, formatTalentIdList } from './helpers/TalentHelper'
import { DateTime, Duration } from 'luxon'

interface ModuleConfig {
	host?: string
	port?: string
}

export class NsgLayoutsInstance extends InstanceBase<ModuleConfig> {
	private socket!: NodeCGConnector<NsgBundleMap>
	private readonly timerUpdateFn: (time?: Timer) => void
	private twitchCommercialTimerUpdateInterval: NodeJS.Timeout | undefined = undefined
	twitchCommercialsPlaying: boolean = false
	canStartTwitchCommercials: boolean = false

	constructor(internal: unknown) {
		super(internal)

		this.timerUpdateFn = throttle((timer?: Timer) => {
			this.checkFeedbacks(NsgFeedback.TimerState, NsgFeedback.TeamTimerState, NsgFeedback.OneTeamTimerState)
			const teamResultVariables = this.getTeamResultVariables()
			if (timer == null) {
				this.setVariableValues({
					...teamResultVariables,
					timer_state: 'STOPPED',
					timer_hours: '0',
					timer_minutes: '00',
					timer_seconds: '00',
					timer_raw: 0,
				})
			} else {
				this.setVariableValues({
					...teamResultVariables,
					timer_state: timer.state,
					timer_hours: String(timer.time.hours),
					timer_minutes: String(timer.time.minutes).padStart(2, '0'),
					timer_seconds: String(timer.time.seconds).padStart(2, '0'),
					timer_raw: timer.time.rawTime,
				})
			}
		}, 500)
	}

	public async init(config: ModuleConfig): Promise<void> {
		this.socket = new NodeCGConnector<NsgBundleMap>(
			this,
			{ host: config.host, port: config.port },
			{
				[LAYOUT_BUNDLE_NAME]: [
					'activeSpeedrun',
					'nextSpeedrun',
					'donationTotal',
					'schedule',
					'talent',
					'timer',
					'twitchCommercialState',
					'twitchData',
				],
			},
			{ [LAYOUT_BUNDLE_NAME]: '^0.1.0' }
		)

		this.setPresetDefinitions(getPresetDefinitions(this, this.socket))
		this.setVariableDefinitions(getVariableDefinitions(this.socket))
		this.setFeedbackDefinitions(getFeedbackDefinitions(this, this.socket))
		this.setActionDefinitions(getActionDefinitions(this.socket))

		this.socket.on('replicantUpdate', (name) => {
			this.assignDynamicVariablesAndFeedback(name as keyof NsgLayoutsReplicantMap)
		})

		this.socket.start()
	}

	async destroy() {
		this.socket.disconnect()
	}

	public async configUpdated(config: ModuleConfig): Promise<void> {
		this.socket?.updateConfig({
			host: config.host,
			port: config.port,
		})
		this.setFeedbackDefinitions(getFeedbackDefinitions(this, this.socket))
		this.setPresetDefinitions(getPresetDefinitions(this, this.socket))
	}

	public getConfigFields(): SomeCompanionConfigField[] {
		return getConfigFields()
	}

	private getTeamResultVariables(): Record<string, CompanionVariableValue | undefined> {
		const result: Record<string, CompanionVariableValue | undefined> = {}
		const teams = this.socket.replicants[LAYOUT_BUNDLE_NAME].activeSpeedrun?.teams ?? []

		for (const i of Array(Math.max(4, teams.length)).keys()) {
			const team = teams[i]
			const teamResult = team == null ? null : this.socket.replicants[LAYOUT_BUNDLE_NAME].timer?.teamResults[team.id]
			const variableName = `team_result_${i + 1}`
			if (teamResult == null) {
				result[variableName] = undefined
			} else {
				result[variableName] = `${teamResult.time.hours}:${String(teamResult.time.minutes).padStart(2, '0')}:${String(
					teamResult.time.seconds
				).padStart(2, '0')}.${String(Math.round(teamResult.time.milliseconds)).padStart(3, '0')[0]}`
			}
		}

		return result
	}

	private getTeamNameVariables(): Record<string, CompanionVariableValue | undefined> {
		const result: Record<string, CompanionVariableValue | undefined> = {}
		const teams = this.socket.replicants[LAYOUT_BUNDLE_NAME].activeSpeedrun?.teams ?? []

		for (const i of Array(Math.max(4, teams.length)).keys()) {
			const team = teams[i]
			const variableName = `team_name_${i + 1}`
			if (team == null) {
				result[variableName] = undefined
			} else {
				result[variableName] = isBlank(team.name)
					? formatTalentIdList(this.socket.replicants[LAYOUT_BUNDLE_NAME].talent ?? [], team.playerIds)
					: team.name
			}
		}

		return result
	}

	private getSpeedrunIndices() {
		const speedruns = (this.socket.replicants[LAYOUT_BUNDLE_NAME].schedule?.items ?? []).filter(
			(scheduleItem) => scheduleItem.type === 'SPEEDRUN'
		)
		const activeSpeedrun = this.socket.replicants[LAYOUT_BUNDLE_NAME].activeSpeedrun
		const nextSpeedrun = this.socket.replicants[LAYOUT_BUNDLE_NAME].nextSpeedrun
		const activeSpeedrunIndex =
			activeSpeedrun == null ? -1 : speedruns.findIndex((speedrun) => speedrun.id === activeSpeedrun.id)
		const nextSpeedrunIndex =
			nextSpeedrun == null ? -1 : speedruns.findIndex((speedrun) => speedrun.id === nextSpeedrun.id)
		return {
			total: speedruns.length,
			active: activeSpeedrunIndex === -1 ? '?' : activeSpeedrunIndex + 1,
			next: nextSpeedrunIndex === -1 ? '?' : nextSpeedrunIndex + 1,
		}
	}

	private updateTwitchCommercialVariables() {
		const getDiffNow = (date: string | undefined): string | undefined => {
			if (date == null) {
				return undefined
			}

			const diffNow = DateTime.fromISO(date).diffNow()
			if (diffNow.milliseconds < 0) {
				return undefined
			}
			return diffNow.shiftTo('minutes', 'seconds').toFormat('m:ss')
		}

		const endTimeText = getDiffNow(this.socket.replicants[LAYOUT_BUNDLE_NAME].twitchCommercialState?.endTime)
		const retryTimeText = getDiffNow(this.socket.replicants[LAYOUT_BUNDLE_NAME].twitchCommercialState?.retryTime)
		this.canStartTwitchCommercials = retryTimeText == null
		this.twitchCommercialsPlaying = endTimeText != null
		this.setVariableValues({
			twitch_commercial_retry_time: retryTimeText,
			twitch_commercial_end_time: endTimeText,
		})
		this.checkFeedbacks(NsgFeedback.TwitchCommercialCooldownInProgress, NsgFeedback.TwitchCommercialsPlaying)
		if (endTimeText == null && retryTimeText == null) {
			clearInterval(this.twitchCommercialTimerUpdateInterval)
		}
	}

	assignDynamicVariablesAndFeedback(replicantName: keyof NsgLayoutsReplicantMap | 'bundles') {
		switch (replicantName) {
			case 'activeSpeedrun': {
				this.setVariableDefinitions(getVariableDefinitions(this.socket))
				this.setActionDefinitions(getActionDefinitions(this.socket))
				this.setFeedbackDefinitions(getFeedbackDefinitions(this, this.socket))
				this.setPresetDefinitions(getPresetDefinitions(this, this.socket))
				const activeSpeedrun = this.socket.replicants[LAYOUT_BUNDLE_NAME].activeSpeedrun
				const indices = this.getSpeedrunIndices()
				this.setVariableValues({
					team_count: activeSpeedrun?.teams.length ?? 0,
					active_run_name: activeSpeedrun?.title,
					active_run_category: activeSpeedrun?.category ?? undefined,
					active_run_index: indices.active,
					active_run_estimate:
						activeSpeedrun?.estimate == null
							? undefined
							: Duration.fromISO(activeSpeedrun.estimate).shiftTo('hours', 'minutes', 'seconds').toFormat('h:mm:ss'),
					...this.getTeamNameVariables(),
				})
				this.checkFeedbacks(NsgFeedback.TeamExists)
				break
			}
			case 'nextSpeedrun': {
				const nextSpeedrun = this.socket.replicants[LAYOUT_BUNDLE_NAME].nextSpeedrun
				const indices = this.getSpeedrunIndices()
				this.setVariableValues({
					next_run_name: nextSpeedrun?.title,
					next_run_category: nextSpeedrun?.category ?? undefined,
					next_run_index: indices.next,
					next_run_estimate:
						nextSpeedrun?.estimate == null
							? undefined
							: Duration.fromISO(nextSpeedrun.estimate).shiftTo('hours', 'minutes', 'seconds').toFormat('h:mm:ss'),
					next_run_players: formatSpeedrunTeamList(
						this.socket.replicants[LAYOUT_BUNDLE_NAME].talent ?? [],
						nextSpeedrun?.teams ?? []
					),
				})
				break
			}
			case 'schedule': {
				const indices = this.getSpeedrunIndices()
				this.setVariableValues({
					speedrun_count: indices.total,
					active_run_index: indices.active,
					next_run_index: indices.next,
				})
				break
			}
			case 'talent':
				this.setVariableValues({
					...this.getTeamNameVariables(),
					next_run_players: formatSpeedrunTeamList(
						this.socket.replicants[LAYOUT_BUNDLE_NAME].talent ?? [],
						this.socket.replicants[LAYOUT_BUNDLE_NAME].nextSpeedrun?.teams ?? []
					),
				})
				break
			case 'timer':
				this.timerUpdateFn(this.socket.replicants[LAYOUT_BUNDLE_NAME].timer)
				break
			case 'donationTotal':
				const rawTotal = this.socket.replicants[LAYOUT_BUNDLE_NAME].donationTotal ?? 0
				this.setVariableValues({
					donation_total: `${formatCurrencyAmount(rawTotal)} kr`,
					donation_total_raw: rawTotal,
				})
				break
			case 'twitchCommercialState':
				clearInterval(this.twitchCommercialTimerUpdateInterval)
				this.updateTwitchCommercialVariables()
				this.twitchCommercialTimerUpdateInterval = setInterval(this.updateTwitchCommercialVariables.bind(this), 250)
				break
			case 'twitchData':
				this.checkFeedbacks(NsgFeedback.TwitchLoginExists)
				break
		}
	}
}

runEntrypoint(NsgLayoutsInstance, [])
