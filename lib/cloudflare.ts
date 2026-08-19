import { getCloudflareContext } from '@opennextjs/cloudflare/cloudflare-context'

export async function getAppCloudflareContext() {
  return getCloudflareContext({ async: true })
}

export async function getAppCloudflareEnv() {
  return (await getAppCloudflareContext()).env
}
