import { useState } from 'react'

function depsChanged(previous: readonly unknown[], next: readonly unknown[]): boolean {
    return previous.length !== next.length || previous.some((dep, i) => !Object.is(dep, next[i]))
}

/**
 * Calls `onChange` during render whenever one of `deps` differs from the previous render.
 * It does not run on the initial render, so derive initial state in `useState` instead.
 *
 * This is React's recommended way to adjust state in response to a prop change and avoids the
 * extra render pass caused by calling setState inside an effect.
 * See https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
 *
 * `onChange` may only update state of the calling component.
 */
export function useOnChange(deps: readonly unknown[], onChange: () => void) {
    const [previousDeps, setPreviousDeps] = useState(deps)

    if (depsChanged(previousDeps, deps)) {
        setPreviousDeps(deps)
        onChange()
    }
}
