import { appendFileSync, existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const reportPath = process.argv[2] ?? 'eslint-report.json'
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
            level: m.severity === 2 ? 'error' : 'warning',
        })
    }
}

// Errors first, then warnings
findings.sort((a, b) => (a.level === b.level ? 0 : a.level === 'error' ? -1 : 1))

const errors = findings.filter((f) => f.level === 'error').length
const warnings = findings.length - errors

// GitHub annotations (shown on the run page and in PR diffs)
for (const f of findings) {
    console.log(
        `::${f.level} file=${f.file},line=${f.line},col=${f.column},title=${f.rule}::${escapeData(f.message)}`,
    )
}

// Job summary
const lines = ['## ESLint', '']
if (findings.length === 0) {
    lines.push('✅ No errors or warnings.')
} else {
    lines.push(`${errors > 0 ? '❌' : '⚠️'} **${errors} error(s)**, **${warnings} warning(s)**`)
    if (errors === 0) {
        lines.push('', 'Warnings do not fail the pipeline, but should be cleaned up.')
    }
    lines.push('', '| Level | Location | Rule | Message |', '|---|---|---|---|')
    for (const f of findings.slice(0, MAX_ROWS)) {
        lines.push(
            `| ${f.level} | \`${f.file}:${f.line}\` | \`${f.rule}\` | ${escapeCell(f.message)} |`,
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
