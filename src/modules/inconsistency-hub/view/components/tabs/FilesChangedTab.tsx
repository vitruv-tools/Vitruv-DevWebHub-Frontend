import { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, CircularProgress, Typography } from '@mui/material'
import type { VitruviusClient } from '../../../../model-editor/infra/vitruvius-client.ts'
import { getInconsistencyContext, getInconsistencyModelSnapshot } from '../../../api/inconsistency-api.ts'
import type { InconsistencyContext, OpenInconsistency } from '../../../types/open-inconsistency.ts'
import type { ApiEcoreModelPackage } from '../../../../model-editor/types/api-ecore-model.ts'
import { EcoreModelApiToStructuredConverter } from '../../../../model-editor/converter/ecore-model-api-to-structured-converter.ts'
import { ResourcesApiToStructuredConverter } from '../../../../model-editor/converter/resources-api-to-structured-converter.ts'
import type { StructuredResource } from '../../../../model-editor/types/structured-resource.ts'
import { getAllStructuredResources } from '../../../../model-editor/helpers/structured-resource-helpers.ts'
import { structuredResourceLabel } from '../../../../model-editor/helpers/display-helpers.ts'
import { CustomTreeView } from '../../../../../common/components/CustomTreeView.tsx'
import type { TreeNode } from '../../../../model-editor/types/tree-node.ts'
import { HubMermaidDiagram } from './HubMermaidDiagram.tsx'
import { isNil } from '../../../../../common/utils/nil-utils.ts'
import {
    ecoreModelsForResourceSet,
    parseEncodedResourceSet,
} from '../../../helpers/model-snapshot-helpers.ts'
import { resolveInconsistencyHighlight } from '../../../helpers/inconsistency-highlight-helpers.ts'
import { enrichModelForInconsistency } from '../../../helpers/inconsistency-model-enrichment.ts'
import {
    linkedResourceIdsFor,
    resolveHubCorrespondencePairs,
} from '../../../helpers/snapshot-correspondences.ts'
import { CorrespondencePanel } from './CorrespondencePanel.tsx'

type Props = {
    inconsistency: OpenInconsistency
    client: VitruviusClient
}

function toReadOnlyTreeNodes(resources: StructuredResource[]): TreeNode[] {
    function convertOne(resource: StructuredResource): TreeNode {
        const children = resource.containmentReferences.flatMap(cref => {
            if (isNil(cref.value)) {
                return []
            }
            const nested = Array.isArray(cref.value) ? cref.value : [cref.value]
            return nested.map(convertOne)
        })
        return {
            id: resource.id,
            label: structuredResourceLabel(resource),
            children,
        }
    }

    return resources.map(convertOne)
}

const panelSx = {
    border: 1,
    borderColor: 'divider',
    borderRadius: 1,
    overflow: 'auto',
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
} as const

/**
 * Hub visualization: clickable model tree/diagram synced with navigable correspondences.
 */
export function FilesChangedTab({ inconsistency, client }: Props) {
    const [structuredResources, setStructuredResources] = useState<StructuredResource[]>([])
    const [context, setContext] = useState<InconsistencyContext | null>(null)
    const [metamodelName, setMetamodelName] = useState<string | null>(null)
    const [viewTypeName, setViewTypeName] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    /** Blue diagram highlight only after an explicit user click/selection. */
    const [userSelectedResourceId, setUserSelectedResourceId] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        setError(null)
        setStructuredResources([])
        setUserSelectedResourceId(null)

        async function load() {
            try {
                const snapshot = await getInconsistencyModelSnapshot(client, inconsistency.id)
                if (cancelled) {
                    return
                }

                const metamodel = snapshot.metamodelName
                if (!metamodel) {
                    throw new Error('VSUM metamodel name is missing on the snapshot')
                }

                const resourceSet = parseEncodedResourceSet(snapshot.encodedResourceSet)
                if (resourceSet.length === 0) {
                    throw new Error('Model snapshot contains no resources')
                }

                const ecoreResponse = await client.request(`/v1/metamodels/${metamodel}/ecore-models`)
                if (!ecoreResponse.ok) {
                    throw new Error(`Failed to load metamodel ${metamodel}`)
                }
                const apiEcoreModelPackages: ApiEcoreModelPackage[] = await ecoreResponse.json()
                const ecoreModels = apiEcoreModelPackages.map(pkg =>
                    new EcoreModelApiToStructuredConverter().convert(pkg),
                )
                const sortedEcoreModels = ecoreModelsForResourceSet(resourceSet, ecoreModels)
                const converted = new ResourcesApiToStructuredConverter().convert(
                    resourceSet as Parameters<ResourcesApiToStructuredConverter['convert']>[0],
                    sortedEcoreModels,
                )
                const enriched = enrichModelForInconsistency(converted, inconsistency)

                if (cancelled) {
                    return
                }

                setStructuredResources(enriched)
                setMetamodelName(snapshot.metamodelName ?? null)
                setViewTypeName(snapshot.viewTypeName ?? null)
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : String(err))
                }
            } finally {
                if (!cancelled) {
                    setLoading(false)
                }
            }
        }

        void load()

        return () => {
            cancelled = true
        }
    }, [client, inconsistency.id, inconsistency.message, inconsistency.title])

    useEffect(() => {
        let cancelled = false
        setContext(null)

        async function loadContext() {
            try {
                const inconsistencyContext = await getInconsistencyContext(client, inconsistency.id)
                if (!cancelled) {
                    setContext(inconsistencyContext)
                }
            } catch {
                if (!cancelled) {
                    setContext({
                        inconsistencyId: inconsistency.id,
                        vsumId: inconsistency.vsumId,
                        vsumName: inconsistency.vsumName,
                        note: 'Correspondences could not be loaded.',
                        elements: [],
                        correspondences: [],
                    })
                }
            }
        }

        void loadContext()

        return () => {
            cancelled = true
        }
    }, [client, inconsistency.id, inconsistency.vsumId, inconsistency.vsumName])

    const treeNodes = useMemo(() => toReadOnlyTreeNodes(structuredResources), [structuredResources])

    const highlight = useMemo(
        () => resolveInconsistencyHighlight(structuredResources, inconsistency),
        [structuredResources, inconsistency],
    )

    const correspondencePairs = useMemo(
        () => resolveHubCorrespondencePairs(structuredResources, context),
        [structuredResources, context],
    )

    const allResources = useMemo(
        () => getAllStructuredResources(structuredResources),
        [structuredResources],
    )

    const userSelectedResource = useMemo(
        () => allResources.find(res => res.id === userSelectedResourceId),
        [allResources, userSelectedResourceId],
    )

    const linkedResources = useMemo(() => {
        if (!userSelectedResourceId) {
            return []
        }
        const linkedIds = linkedResourceIdsFor(userSelectedResourceId, correspondencePairs)
        const byId = new Map(allResources.map(res => [res.id, res]))
        return linkedIds
            .map(id => byId.get(id))
            .filter((res): res is StructuredResource => res != null)
    }, [userSelectedResourceId, correspondencePairs, allResources])

    const selectResource = useCallback((resourceId: string) => {
        setUserSelectedResourceId(resourceId)
    }, [])

    const mermaidHighlightOptions = useMemo(
        () => ({
            rootResourceId: highlight.rootResourceId,
            rootResourceIds: highlight.rootResourceIds,
            selectedResourceId: userSelectedResourceId,
        }),
        [highlight.rootResourceId, highlight.rootResourceIds, userSelectedResourceId],
    )

    if (loading) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2 }}>
                <CircularProgress size={20} />
                <Typography color='text.secondary'>Loading model snapshot…</Typography>
            </Box>
        )
    }

    if (error) {
        return (
            <Typography color='error' sx={{ p: 2 }}>
                {error}
            </Typography>
        )
    }

    if (structuredResources.length === 0) {
        return (
            <Typography color='text.secondary' sx={{ p: 2 }}>
                Model snapshot is empty. Park a new inconsistency from the editor (Update → dismiss prompt with X)
                after rebuilding the server so the model is captured at park time.
            </Typography>
        )
    }

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                flex: 1,
                minHeight: { xs: 420, md: 520 },
                height: '100%',
            }}
        >
            {(metamodelName || viewTypeName) && (
                <Typography variant='body2' color='text.secondary' sx={{ flexShrink: 0 }}>
                    {metamodelName}
                    {viewTypeName ? ` · view ${viewTypeName}` : ''}
                </Typography>
            )}

            <Box
                sx={{
                    flex: 1,
                    minHeight: { xs: 360, md: 480 },
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 220px) minmax(0, 1fr) 176px' },
                    gridTemplateRows: { xs: 'minmax(110px, 140px) minmax(360px, 1fr) minmax(130px, 170px)', lg: '1fr' },
                    gap: 0.75,
                    overflow: 'hidden',
                }}
            >
                <Box
                    sx={{
                        ...panelSx,
                        minHeight: 0,
                        height: '100%',
                        maxWidth: 220,
                        width: '100%',
                        overflowX: 'hidden',
                        fontSize: '0.72rem',
                        '& .MuiTypography-root': { fontSize: 'inherit' },
                        '& .MuiTreeItem-label': { fontSize: '0.72rem', lineHeight: 1.25 },
                        '& .MuiTreeItem-content': { py: 0.15, minHeight: 24, maxWidth: '100%' },
                    }}
                >
                    <Typography
                        variant='caption'
                        sx={{ px: 0.75, pt: 0.75, pb: 0.25, flexShrink: 0, fontWeight: 600, display: 'block' }}
                    >
                        Model overview
                    </Typography>
                    <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', maxWidth: '100%' }}>
                        <CustomTreeView
                            items={treeNodes}
                            selectedItem={userSelectedResourceId}
                            onSelectItem={itemId => {
                                if (itemId) {
                                    selectResource(itemId)
                                }
                            }}
                            defaultExpandAll
                            fitContainer
                            rootHighlightItemId={highlight.rootResourceId}
                            rootHighlightItemIds={highlight.rootResourceIds}
                        />
                    </Box>
                </Box>

                <Box
                    sx={{
                        ...panelSx,
                        minWidth: 0,
                        minHeight: 0,
                        height: '100%',
                        bgcolor: 'background.default',
                    }}
                >
                    <HubMermaidDiagram
                        structuredResources={structuredResources}
                        highlightOptions={mermaidHighlightOptions}
                        onSelectResource={selectResource}
                    />
                </Box>

                <Box sx={{ ...panelSx, minHeight: 0, height: '100%', overflow: 'auto' }}>
                    <CorrespondencePanel
                        selectedResource={userSelectedResource}
                        linkedResources={linkedResources}
                        userHasSelection={userSelectedResourceId != null}
                        onSelectResource={selectResource}
                    />
                </Box>
            </Box>

            <Typography variant='caption' color='text.secondary' sx={{ flexShrink: 0 }}>
                Red = inconsistency · click an element for blue selection and correspondences · scroll to zoom · drag to pan
            </Typography>
        </Box>
    )
}
