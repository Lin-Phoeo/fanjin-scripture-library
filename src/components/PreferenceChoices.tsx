import { interestOptions, type PersonalPreferences } from '../lib/personal-preferences';

type Props = { value: PersonalPreferences; update: (value: Partial<PersonalPreferences>) => void; disabled?: boolean; compact?: boolean };
export default function PreferenceChoices({ value, update, disabled, compact }: Props) {
  const toggle = (interest: string) => update({ interests: value.interests.includes(interest) ? value.interests.filter((item) => item !== interest) : [...value.interests, interest] });
  return <div className={compact ? 'preference-choices is-compact' : 'preference-choices'}>
    <fieldset disabled={disabled}><legend>想读哪一类？<span>可多选</span></legend><div className="interest-options"><button type="button" aria-pressed={!value.interests.length} onClick={() => update({ interests: [] })}>都想看看</button>{interestOptions.map((interest) => <button type="button" key={interest} aria-pressed={value.interests.includes(interest)} onClick={() => toggle(interest)}>{interest}</button>)}</div></fieldset>
    <fieldset disabled={disabled}><legend>今天留多少时间？</legend><div className="time-options">{([5, 15, 30] as const).map((minutes) => <button type="button" key={minutes} aria-pressed={value.minutes === minutes} onClick={() => update({ minutes })}>{minutes}<span>分钟</span></button>)}</div></fieldset>
    <fieldset disabled={disabled}><legend>这次更想</legend><div className="intention-options">{([['quiet', '安静读一会'], ['understand', '多理解一点'], ['reflect', '留一点心得']] as const).map(([intention, label]) => <button type="button" key={intention} aria-pressed={value.intention === intention} onClick={() => update({ intention })}>{label}</button>)}</div></fieldset>
  </div>;
}
