/**
 * Body text for the automatic Comments entry when an inconsistency is resolved from the Hub.
 */
export function formatResolutionCommentBody(input: {
    resolvedBy: string
    choice: string
    comment?: string
}): string {
    const lines = [
        'Resolved this inconsistency.',
        `Resolver: ${input.resolvedBy}`,
        `Selected choice: ${input.choice}`,
    ]
    if (input.comment?.trim()) {
        lines.push(`Resolution message: ${input.comment.trim()}`)
    }
    return lines.join('\n')
}
