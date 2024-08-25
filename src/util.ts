import { ActiveSpeedrun } from './types/replicants/activeSpeedrun'
import { DonationTotal } from './types/replicants/donationTotal'
import { NextSpeedrun } from './types/replicants/nextSpeedrun'
import { Schedule } from './types/replicants/schedule'
import { Talent } from './types/replicants/talent'
import { Timer } from './types/replicants/timer'

export const LAYOUT_BUNDLE_NAME = 'nsg2-layouts'

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
}
