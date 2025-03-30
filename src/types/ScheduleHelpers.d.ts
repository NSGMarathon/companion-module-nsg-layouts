import type { OtherScheduleItem, Schedule, Speedrun, Talent } from './schemas';

export type ScheduleItemType = Schedule['items'][number]['type'];
export type ScheduleItem = Schedule['items'][number];

export type TalentItem = Talent[number];
export type SpeedrunWithTalentInfo = {
    commentators: (TalentItem | undefined | null)[],
    teams: (Speedrun['teams'][number] & { players: (TalentItem | undefined | null)[] })[]
} & Speedrun;
export type OtherScheduleItemWithTalentInfo = OtherScheduleItem & {
    talent: (TalentItem | undefined | null)[]
};
export type ScheduleItemWithTalentInfo = SpeedrunWithTalentInfo | OtherScheduleItemWithTalentInfo;
