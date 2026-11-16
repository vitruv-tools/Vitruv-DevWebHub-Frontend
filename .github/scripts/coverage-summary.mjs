import { appendFileSync, existsSync, readFileSync } from 'node:fs'

const file = 'coverage/coverage-summary.json'

if (!existsSync(file)) {
    console.log('No coverage summary found.')
    process.exit(0)
}

const { total } = JSON.parse(readFileSync(file, 'utf8'))
const row = (name, m) => `| ${name} | ${m.pct}% | ${m.covered} / ${m.total} |`

const md =
    [
        '## Test coverage',
        '',
        '| Metric | Coverage | Covered / Total |',
        '|---|---|---|',
        row('Statements', total.statements),
        row('Branches', total.branches),
        row('Functions', total.functions),
        row('Lines', total.lines),
        '',
        'The full HTML report is available as the `coverage-report` artifact.',
    ].join('\n') + '\n'

if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, md)
} else {
    console.log(md)
}
