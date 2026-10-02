export const exampleQuestion = 'Do these records support closing the gateway upgrade as successfully validated? Identify contradictions, missing checks and the next steps for a human reviewer.';

export const exampleSources = [
  {
    id: 'source-1',
    name: '2026-10-01-change-plan.txt',
    text: `FICTIONAL EXAMPLE. No client or production system is represented.
Record: LAB-CHG-014. Date: 2026-10-01.
Service: Harbour test network. Gateways: LAB-GW-A and LAB-GW-B.
Proposed change: upgrade the standby gateway, then the active gateway.
Change window: 10:00–10:30 UTC.
Intended outcome: both gateways run the new version with stable service and a usable rollback route.
Closure must follow LAB-POL-003. The service owner reviews the evidence before accepting the change.`
  },
  {
    id: 'source-2',
    name: '2026-10-01-observations.txt',
    text: `FICTIONAL EXAMPLE. No client or production system is represented.
Record: LAB-OBS-021. Date: 2026-10-01.
Baseline observation: 09:30–10:00 UTC, active gateway; packet loss 0.0%, p95 latency 12 ms.
Upgrade completion recorded at 10:12 UTC for both gateways.
Post-change observation: 10:12–10:17 UTC (5 minutes), active gateway only; packet loss 0.0%, p95 latency 13 ms.
The standby gateway was not carrying traffic during this observation.
No observations after 10:17 UTC are included in this record.`
  },
  {
    id: 'source-3',
    name: '2026-10-01-closure-policy.txt',
    text: `FICTIONAL EXAMPLE. No client or production system is represented.
Record: LAB-POL-003. Version: 1. Date: 2026-10-01.
At least 30 minutes of stable observations on both gateways are required before closure.
Validation must include traffic failover to the standby gateway and a recorded service check after failover.
A rollback rehearsal must be recorded, or the service owner must explicitly accept and document its omission.
The service owner must sign off the evidence before the change is closed.`
  },
  {
    id: 'source-4',
    name: '2026-10-01-closure-note.txt',
    text: `FICTIONAL EXAMPLE. No client or production system is represented.
Record: LAB-NOTE-008. Date: 2026-10-01. Time: 10:18 UTC.
Draft closure statement: All acceptance checks are complete; the change can be closed.
Operator note: Rollback was discussed but not run. Standby-path failover was not exercised.
Service-owner sign-off: pending.
No acceptance of the omitted rollback rehearsal is recorded.`
  }
];

export const exampleAssessment = {
  verdict: 'insufficient-evidence',
  summary: 'The supplied records do not establish that the upgrade meets its closure policy. They show five minutes of observations on the active gateway, with failover and rollback checks outstanding and owner sign-off pending. The closure statement conflicts with those records. This does not establish that the upgrade failed; it leaves successful validation unproven.',
  findings: [
    {
      id: 'finding-1', title: 'The active gateway had a short period with no recorded packet loss', status: 'supported',
      detail: 'The post-change record reports 0.0% packet loss and p95 latency of 13 ms over five minutes. This observation covers only the active gateway and is shorter than the required validation period.',
      citations: [{ sourceId: 'source-2', quote: 'Post-change observation: 10:12–10:17 UTC (5 minutes), active gateway only; packet loss 0.0%, p95 latency 13 ms.' }]
    },
    {
      id: 'finding-2', title: 'All acceptance checks are complete', status: 'contradicted',
      detail: 'The draft claims completion, but the policy requires at least 30 minutes on both gateways and the observation record covers five minutes on one. The closure note also records unperformed checks.',
      citations: [
        { sourceId: 'source-4', quote: 'Draft closure statement: All acceptance checks are complete; the change can be closed.' },
        { sourceId: 'source-3', quote: 'At least 30 minutes of stable observations on both gateways are required before closure.' },
        { sourceId: 'source-2', quote: 'Post-change observation: 10:12–10:17 UTC (5 minutes), active gateway only; packet loss 0.0%, p95 latency 13 ms.' }
      ]
    },
    {
      id: 'finding-3', title: 'The standby path will maintain service during failover', status: 'unknown',
      detail: 'The records contain no exercised failover or post-failover service check, so they do not establish standby-path behaviour.',
      citations: [{ sourceId: 'source-4', quote: 'Standby-path failover was not exercised.' }]
    },
    {
      id: 'finding-4', title: 'A usable rollback route has been demonstrated', status: 'unknown',
      detail: 'The closure note records no rehearsal and no acceptance of its omission. A discussion of rollback does not demonstrate that it can be carried out.',
      citations: [
        { sourceId: 'source-4', quote: 'Rollback was discussed but not run.' },
        { sourceId: 'source-4', quote: 'No acceptance of the omitted rollback rehearsal is recorded.' }
      ]
    }
  ],
  missingChecks: [
    'At least 30 minutes of stable observations covering both gateways.',
    'A recorded failover to the standby gateway and service check afterwards.',
    'A recorded rollback rehearsal, or documented owner acceptance of its omission.',
    'Service-owner sign-off of the validation evidence.'
  ],
  nextSteps: [
    'Keep the closure decision pending and correct the draft statement that all checks are complete.',
    'Ask the responsible engineer to supply the required observations and validation records.',
    'Return the completed evidence pack to the service owner for a closure decision.'
  ]
};
