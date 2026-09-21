export function removeKeys(keys: string[], object: any): any {
    if (Array.isArray(object)) {
        return object.map(item => removeKeys(keys, item))
    }

    if (object !== null && typeof object === 'object') {
        return Object.fromEntries(
            Object.entries(object)
                .filter(([key]) => !keys.includes(key))
                .map(([key, value]) => [key, removeKeys(keys, value)]),
        )
    }

    return object
}

export function replaceByKey(replacements: { [key: string]: (value: any) => any }[], object: any): any {
    if (Array.isArray(object)) {
        return object.map(item => replaceByKey(replacements, item))
    }

    if (object !== null && typeof object === 'object') {
        return Object.fromEntries(
            Object.entries(object).map(([key, value]) => {
                const match = replacements.find(r => r[key] !== undefined)
                return match
                    ? [key, match[key](value)]
                    : [key, replaceByKey(replacements, value)]
            }),
        )
    }

    return object
}

export function printDiff(a: any, b: any) {
    console.log('Diff: ')
    console.log(JSON.stringify(a))
    console.log(JSON.stringify(b))
}

export function deepCompare(a: any, b: any) {
    if (Array.isArray(a)) {
        if (!Array.isArray(b) || a.length !== b.length) {
            printDiff(a, b)
        } else {
            for (let i = 0; i < a.length; i++) {
                deepCompare(a[i], b[i])
            }
        }
    } else if (typeof a === 'object') {
        if (typeof b !== 'object') {
            printDiff(a, b)
        } else {
            for (const key in a) {
                if (b.hasOwnProperty(key)) {
                    deepCompare(a[key], b[key])
                } else {
                    printDiff(a, b)
                }
            }
        }
    } else {
        if (a !== b) {
            printDiff(a, b)
        }
    }
}
