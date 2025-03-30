import { ActiveSpeedrun } from './types/replicants/activeSpeedrun'
import { DonationTotal } from './types/replicants/donationTotal'
import { NextSpeedrun } from './types/replicants/nextSpeedrun'
import { Schedule } from './types/replicants/schedule'
import { Talent } from './types/replicants/talent'
import { Timer } from './types/replicants/timer'
import { TwitchCommercialState } from './types/replicants/twitchCommercialState'
import { TwitchData } from './types/replicants/twitchData'
import { ObsConfig } from './types/replicants/obsConfig'
import { ObsState } from './types/replicants/obsState'

export const LAYOUT_BUNDLE_NAME = 'nsg2-layouts'
export const LAYOUT_FEED_COUNT = 3

export type NsgBundleMap = {
	[LAYOUT_BUNDLE_NAME]: NsgLayoutsReplicantMap
}

export interface NsgLayoutsReplicantMap {
	activeSpeedrun?: ActiveSpeedrun
	nextSpeedrun?: NextSpeedrun
	donationTotal?: DonationTotal
	schedule?: Schedule
	talent?: Talent
	timer?: Timer
	twitchCommercialState?: TwitchCommercialState
	twitchData?: TwitchData
	obsConfig?: ObsConfig
	obsState?: ObsState
}
