import 'server-only'
import { cookies } from 'next/headers'

type SP = Record<string, string | string[] | undefined>

/** Name of the cookie that remembers the last filters used on a list page. */
export const filtersCookie = (page: string) => `filters_${page}`

/**
 Filters for a list page: from the URL when it has any, otherwise the last ones used on this page (cookie),
 unless "?reset=1" (clear filters). Render <RememberFilters page qs reset /> on the page to save them.
*/
export async function rememberedFilters(page: string, sp: SP, keys: readonly string[]) {
  const str = (v: unknown) => (typeof v === 'string' ? v : '')
  const reset = str(sp.reset) === '1'
  let get = (k: string) => str(sp[k])
  if (!reset && !Object.keys(sp).some((k) => keys.includes(k))) {
    let raw = (await cookies()).get(filtersCookie(page))?.value ?? ''
    if (raw && !raw.includes('=')) raw = decodeURIComponent(raw)
    if (raw) {
      const saved = new URLSearchParams(raw)
      get = (k) => saved.get(k) ?? ''
    }
  }
  const out = new URLSearchParams()
  for (const k of keys) if (get(k)) out.set(k, get(k))
  return { get, qs: out.toString(), reset }
}
