import { useI18n } from '../lib/i18n';
import { interestOptions, type PersonalPreferences } from '../lib/personal-preferences';

type Props = { value: PersonalPreferences; update: (value: Partial<PersonalPreferences>) => void; disabled?: boolean; compact?: boolean };
export default function PreferenceChoices({ value, update, disabled, compact }: Props) {
  const { t } = useI18n();

  const toggle = (interest: string) => update({ interests: value.interests.includes(interest) ? value.interests.filter((item) => item !== interest) : [...value.interests, interest] });
  return <div className={compact ? 'preference-choices is-compact' : 'preference-choices'}>
    <fieldset disabled={disabled}><legend>{t("想读哪一类？")}<span>{t("可多选")}</span></legend><div className="interest-options"><button type="button" aria-pressed={!value.interests.length} onClick={() => update({ interests: [] })}>{t("都想看看")}</button>{interestOptions.map((interest) => <button type="button" key={interest} aria-pressed={value.interests.includes(interest)} onClick={() => toggle(interest)}>{t(interest)}</button>)}</div></fieldset>
    <fieldset disabled={disabled}><legend>{t("今天留多少时间？")}</legend><div className="time-options">{([5, 15, 30] as const).map((minutes) => <button type="button" key={minutes} aria-pressed={value.minutes === minutes} onClick={() => update({ minutes })}>{minutes}<span>{t("分钟")}</span></button>)}</div></fieldset>
    <fieldset disabled={disabled}><legend>{t("这次更想")}</legend><div className="intention-options">{([['quiet', '安静读一会'], ['understand', '多理解一点'], ['reflect', '留一点心得']] as const).map(([intention, label]) => <button type="button" key={intention} aria-pressed={value.intention === intention} onClick={() => update({ intention })}>{t(label)}</button>)}</div></fieldset>
  </div>;
}
