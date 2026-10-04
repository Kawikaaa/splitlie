# Research Evidence Log

This document separates observed evidence from product hypotheses. There are no completed participant interviews or usability tests yet.

## Validated user evidence

None yet. Product-owner feedback identifies concrete UI and parsing defects, but does not validate broader retention or behavior-change claims.

## Product-owner observations

| Date | Observation | Product response |
| --- | --- | --- |
| 2026-09-23 | Full transaction forms feel visually heavy for routine capture. | Default-collapsed Quick Add with reversible details. |
| 2026-09-23 | Rules-only parsing can misclassify merchants or dates. | Parser regression tests, merchant-history classification, and explicit review when uncertain. |
| 2026-09-23 | Mobile modal content could become trapped or clipped. | Sheet-style modal, contained scrolling, sticky actions, responsive V2 cards. |

## Unvalidated solution hypotheses

| Prototype | Problem hypothesis | Expected behavior | Status | Research decision needed |
| --- | --- | --- | --- | --- |
| Quick Add + Add Again | Repetitive capture feels burdensome. | Common expenses can be prepared in 2–3 actions. | Implemented, unvalidated | Measure task time and corrections. |
| Smart defaults | Users repeat merchants and categories. | History-based defaults reduce correction work. | Implemented, unvalidated | Measure wrong suggestions. |
| Dashboard V2 | Raw totals alone do not explain change. | Clear hierarchy answers “where did my money go?” quickly. | Implemented, unvalidated | Test comprehension before more charts. |
| Weekly Recap | Weekly review may be more sustainable than daily review. | Users understand changes and budget status in one scan. | Implemented, unvalidated | Test whether it creates a return moment. |
| Money Signals | A few observations may beat many alerts. | Up to three deterministic signals feel relevant and trustworthy. | Implemented, unvalidated | Test tone and false positives. |
| Weekly Check-in | Lightweight completion may reinforce review. | Users willingly complete it without pressure. | Local prototype, unvalidated | Validate before persistence or notifications. |
| Monthly Reflection | Subjective reflection may add meaning beyond totals. | Users record a feeling and explain why. | Local prototype, unvalidated | Test qualitative value. |

## Evidence rules

- Record sample size, participant context, and task outcome.
- Keep direct quotes separate from interpretation.
- Record wrong predictions and contradictory evidence.
- Measure corrections, completion, confusion, and time—not only preference.
- End each prototype decision with Keep, Modify, Remove, or Continue testing.

