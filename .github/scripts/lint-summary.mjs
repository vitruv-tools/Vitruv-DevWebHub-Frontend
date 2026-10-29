import { appendFileSync, existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const reportPath = process.argv[2] ?? 'eslint-report.json'
const failOnError = process.env.LINT_FAIL_ON_ERROR === 'true'
const MAX_ROWS = 50

if (!existsSync(reportPath)) {
    console.log(`No ESLint report found at ${reportPath}`)
    process.exit(0)
}

const escapeData = (s) => s.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')
const escapeCell = (s) => s.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')

const results = JSON.parse(readFileSync(reportPath, 'utf8'))
const findings = []

for (const result of results) {
    const file = path.relative(process.cwd(), result.filePath).split(path.sep).join('/')
    for (const m of result.messages) {
        findings.push({
            file,
            line: m.line ?? 1,
            column: m.column ?? 1,
            rule: m.ruleId ?? 'parse-error',
            message: m.message,
            severity: m.severity === 2 ? 'error' : 'warning',
        })
    }
}

// Errors first, then warnings
findings.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1))

const errors = findings.filter((f) => f.severity === 'error').length
const warnings = findings.length - errors

// GitHub annotations (shown on the run page and in PR diffs).
// If errors do not fail the pipeline, they are shown as warnings so the
// run page does not look red for a passing job.
for (const f of findings) {
    const annotationLevel = f.severity === 'error' && failOnError ? 'error' : 'warning'
    console.log(
        `::${annotationLevel} file=${f.file},line=${f.line},col=${f.column},title=${f.severity}: ${f.rule}::${escapeData(f.message)}`,
    )
}

// Job summary
const lines = ['## ESLint', '']
if (findings.length === 0) {
    lines.push('✅ No errors or warnings.')
} else {
    const icon = errors > 0 ? (failOnError ? '❌' : '⚠️') : '⚠️'
    lines.push(`${icon} **${errors} error(s)**, **${warnings} warning(s)**`)
    lines.push(
        '',
        failOnError
            ? 'Errors fail the pipeline (`LINT_FAIL_ON_ERROR=true`). Warnings do not.'
            : 'Neither errors nor warnings fail the pipeline (`LINT_FAIL_ON_ERROR` is not `true`), but they should be cleaned up.',
    )
    lines.push('', '| Severity | Location | Rule | Message |', '|---|---|---|---|')
    for (const f of findings.slice(0, MAX_ROWS)) {
        lines.push(
            `| ${f.severity} | \`${f.file}:${f.line}\` | \`${f.rule}\` | ${escapeCell(f.message)} |`,
        )
    }
    if (findings.length > MAX_ROWS) {
        lines.push('', `…and ${findings.length - MAX_ROWS} more (see the step log).`)
    }
}

const md = lines.join('\n') + '\n'
if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, md)
} else {
    console.log(md)
}
