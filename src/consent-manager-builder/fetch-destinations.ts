import fetch from 'isomorphic-fetch'
import { flatten, sortedUniqBy, sortBy } from 'lodash'
import { Destination } from '../types'

async function fetchDestinationForWriteKey(writeKey: string): Promise<Destination[]> {
  const res = await fetch(`https://cdn.segment.com/v1/projects/${writeKey}/integrations`)

  if (!res.ok) {
    throw new Error(
      `Failed to fetch integrations for write key ${writeKey}: HTTP ${res.status} ${res.statusText}`
    )
  }

  const destinations = await res.json()

  // Rename creationName to id to abstract the weird data model
  for (const destination of destinations) {
    destination.id = destination.creationName
    delete destination.creationName
  }
  return destinations
}

async function fetchDestinationForBigCommerce(): Promise<Destination[]> {
  const res = await fetch(
    `https://us-central1-crystal-cavern-197304.cloudfunctions.net/script-manager-js-api`
  )

  if (!res.ok) {
    throw new Error(
      `Failed to fetch BigCommerce script manager entries: HTTP ${res.status} ${res.statusText}`
    )
  }

  const destinations = await res.json()

  return destinations.data.map(scriptManagerEntry =>
    Object.assign({
      id: scriptManagerEntry.uuid,
      name: scriptManagerEntry.name,
      category: scriptManagerEntry.category,
      website: scriptManagerEntry.creator_website,
      description: scriptManagerEntry.description
    })
  )
}

export default async function fetchDestinations(writeKeys: string[]): Promise<Destination[]> {
  const destinationsRequests: Promise<Destination[]>[] = []

  for (const writeKey of writeKeys) {
    if (writeKey.length > 0) {
      destinationsRequests.push(fetchDestinationForWriteKey(writeKey))
    }
  }

  destinationsRequests.push(fetchDestinationForBigCommerce())

  let destinations = flatten(await Promise.all(destinationsRequests))
  // Remove the dummy Repeater destination
  destinations = destinations.filter(d => d.id !== 'Repeater')
  destinations = sortBy(destinations, ['id'])
  destinations = sortedUniqBy(destinations, 'id')

  return destinations
}
