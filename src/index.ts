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
import { formatScheduleItemTalentList, prettyPrintTalentIdList } from './helpers/TalentHelper'
import { DateTime, Duration } from 'luxon'
import { ActiveSpeedrun } from './types/replicants/activeSpeedrun'
import { NextSpeedrun } from './types/replicants/nextSpeedrun'
import { InterstitialVideoState } from './types/replicants/interstitialVideoState'

interface ModuleConfig {
	host?: string
	port?: string
}

export class NsgLayoutsInstance extends InstanceBase<ModuleConfig> {
	private socket!: NodeCGConnector<NsgBundleMap>
	private readonly timerUpdateFn: (time?: Timer) => void
	private readonly talentNameGetter: (id: string) => string | undefined | null
	private twitchCommercialTimerUpdateInterval: NodeJS.Timeout | undefined = undefined
	private interstitialVideoLastPlayedUpdateInterval: NodeJS.Timeout | undefined = undefined
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
		this.talentNameGetter = (talentId) =>
			(this.socket.replicants[LAYOUT_BUNDLE_NAME].talent ?? []).find((talentItem) => talentItem.id === talentId)?.name
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
					'obsConfig',
					'obsState',
					'videoFiles',
					'interstitialVideoState',
					'todoList',
					'stageDisplayState',
				],
			},
			{ [LAYOUT_BUNDLE_NAME]: '^0.1.0' }
		)

		this.setPresetDefinitions(getPresetDefinitions(this, this.socket))
		this.setVariableDefinitions(getVariableDefinitions(this.socket))
		this.setFeedbackDefinitions(getFeedbackDefinitions(this, this.socket))
		this.setActionDefinitions(getActionDefinitions(this.socket))

		this.socket.on('replicantUpdate', (name, bundleName, newValue, oldValue) => {
			if (bundleName === LAYOUT_BUNDLE_NAME) {
				// @ts-ignore: i'm not untangling this maze of types. sorry
				this.assignDynamicVariablesAndFeedback(name as keyof NsgLayoutsReplicantMap, newValue, oldValue)
			}
		})

		this.socket.on('connect', () => {
			this.setFeedbackDefinitions(getFeedbackDefinitions(this, this.socket))
			this.setActionDefinitions(getActionDefinitions(this.socket))
			this.setPresetDefinitions(getPresetDefinitions(this, this.socket))
		})

		this.interstitialVideoLastPlayedUpdateInterval = setInterval(
			this.updateInterstitialLastPlayedVariables.bind(this),
			10000
		)

		this.socket.start()
	}

	async destroy() {
		this.socket.disconnect()
		clearInterval(this.interstitialVideoLastPlayedUpdateInterval)
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
					? prettyPrintTalentIdList(team.playerIds, this.talentNameGetter)
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

	assignDynamicVariablesAndFeedback<Key extends keyof NsgLayoutsReplicantMap>(
		replicantName: Key,
		newValue: NsgLayoutsReplicantMap[Key],
		oldValue: NsgLayoutsReplicantMap[Key] | undefined
	) {
		switch (replicantName) {
			case 'activeSpeedrun': {
				this.setVariableDefinitions(getVariableDefinitions(this.socket))
				this.setActionDefinitions(getActionDefinitions(this.socket))
				this.setFeedbackDefinitions(getFeedbackDefinitions(this, this.socket))
				this.setPresetDefinitions(getPresetDefinitions(this, this.socket))
				const activeSpeedrun = newValue as ActiveSpeedrun
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
				const nextSpeedrun = newValue as NextSpeedrun
				const indices = this.getSpeedrunIndices()
				this.setVariableValues({
					next_run_name: nextSpeedrun?.title,
					next_run_category: nextSpeedrun?.category ?? undefined,
					next_run_index: indices.next,
					next_run_estimate:
						nextSpeedrun?.estimate == null
							? undefined
							: Duration.fromISO(nextSpeedrun.estimate).shiftTo('hours', 'minutes', 'seconds').toFormat('h:mm:ss'),
					next_run_players: formatScheduleItemTalentList(nextSpeedrun, this.talentNameGetter),
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
					next_run_players: formatScheduleItemTalentList(
						this.socket.replicants[LAYOUT_BUNDLE_NAME].nextSpeedrun,
						this.talentNameGetter
					),
				})
				break
			case 'timer':
				this.timerUpdateFn(newValue as Timer)
				break
			case 'donationTotal':
				const rawTotal = newValue as number ?? 0
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
			case 'obsConfig':
			case 'obsState':
				this.checkFeedbacks(
					NsgFeedback.SceneInProgram,
					NsgFeedback.GameLayoutInProgram,
					NsgFeedback.IntermissionInProgram
				)
				this.setActionDefinitions(getActionDefinitions(this.socket))
				this.setFeedbackDefinitions(getFeedbackDefinitions(this, this.socket))
				break
			case 'interstitialVideoState': {
				const newState = newValue as InterstitialVideoState;
				const oldState = oldValue as InterstitialVideoState;
				if (newState.isRunning !== oldState?.isRunning) {
					this.checkFeedbacks(NsgFeedback.InterstitialVideoPlaying)
				}
				this.setVariableValues({
					interstitial_time_remaining: !newState.isRunning || newState.timeRemainingMillis == null ? undefined : Duration.fromMillis(newState.timeRemainingMillis).toFormat('mm:ss'),
				})
				break
			}
			case 'videoFiles':
				this.setActionDefinitions(getActionDefinitions(this.socket))
				this.setFeedbackDefinitions(getFeedbackDefinitions(this, this.socket))
				this.setVariableDefinitions(getVariableDefinitions(this.socket))
				this.updateInterstitialLastPlayedVariables()
				this.setPresetDefinitions(getPresetDefinitions(this, this.socket))
				break
			case 'todoList':
				this.checkFeedbacks(
					NsgFeedback.AllTodoItemsCompleted,
					NsgFeedback.TodoCategoryCompleted,
					NsgFeedback.TodoItemCompleted
				)
				break
			case 'stageDisplayState':
				this.checkFeedbacks(
					NsgFeedback.StageDisplayMessageVisible,
					NsgFeedback.StageDisplayMessageText,
					NsgFeedback.StageDisplayMessageMode,
					NsgFeedback.StageDisplayMessageColor,
					NsgFeedback.StageDisplayMode
				)
				break
		}
	}

	updateInterstitialLastPlayedVariables() {
		const interstitialVideos = this.socket.replicants[LAYOUT_BUNDLE_NAME].videoFiles?.interstitials ?? []
		this.setVariableValues(
			interstitialVideos.reduce((result, video) => {
				result[`interstitial_last_played_${video.name.replaceAll(' ', '_')}`] =
					video.lastPlayed == null
						? 'never'
						: DateTime.fromISO(video.lastPlayed).toRelative({ style: 'narrow' }) ?? 'never'
				return result
			}, {} as Record<string, string>)
		)
		this.checkFeedbacks(NsgFeedback.InterstitialVideoLastPlayed)
	}
}

runEntrypoint(NsgLayoutsInstance, [])
