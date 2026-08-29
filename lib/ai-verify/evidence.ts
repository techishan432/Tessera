import type { Evidence } from "./types";

/**
 * Machine-collected digest of the evidence, handed to the LLM. Fetching real
 * data (live PR state, page content) is what makes the cross-check real: the
 * model judges the claim against facts, not just against the URLs themselves.
 * Failures are reported in the digest — an unavailable source is itself a
 * signal the model should weigh.
 */

const FETCH_TIMEOUT_MS = 8000;
const SNIPPET_CHARS = 1500;
const PR_URL_RE = /^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/i;

export interface EvidenceEntry {
  url: string;
  label?: string;
  /** Machine-read facts (e.g. live GitHub PR state). */
  facts?: Record<string, unknown>;
  /** Best-effort content snippet for non-structured pages. */
  snippet?: string;
  /** Set when the source could not be read. */
  error?: string;
}

export async function collectEvidence(evidence: Evidence[]): Promise<EvidenceEntry[]> {
  const entries: EvidenceEntry[] = [];
  for (const item of evidence) {
    if (item.kind === "attachment") {
      entries.push({
        url: item.url,
        label: item.label,
        facts: { kind: "attachment", note: "binary attachment — content not machine-readable" },
      });
      continue;
    }
    const m = item.url.match(PR_URL_RE);
    if (m) {
      entries.push(await fetchGitHubPr(m[1], m[2], m[3], item.url, item.label));
    } else {
      entries.push(await fetchPageSnippet(item.url, item.label));
    }
  }
  return entries;
}

async function fetchGitHubPr(
  owner: string,
  repo: string,
  number: string,
  url: string,
  label?: string
): Promise<EvidenceEntry> {
  try {
    const res = await fetchWithTimeout(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${number}`,
      { headers: { accept: "application/vnd.github+json", "user-agent": "tessera-verify" } }
    );
    if (!res.ok) {
      return { url, label, error: `GitHub API ${res.status} (PR not found or private)` };
    }
    const pr = (await res.json()) as Record<string, any>;
    return {
      url,
      label,
      facts: {
        kind: "github_pull_request",
        repo: `${owner}/${repo}`,
        number: Number(number),
        title: pr.title,
        state: pr.state,
        merged: Boolean(pr.merged),
        merged_at: pr.merged_at ?? null,
        author: pr.user?.login ?? null,
        additions: pr.additions,
        deletions: pr.deletions,
        body: typeof pr.body === "string" ? pr.body.slice(0, 300) : "",
      },
    };
  } catch (e) {
    return { url, label, error: `GitHub fetch failed: ${(e as Error).message}` };
  }
}

async function fetchPageSnippet(url: string, label?: string): Promise<EvidenceEntry> {
  try {
    const res = await fetchWithTimeout(url, {
      headers: { accept: "text/markdown, text/html, */*" },
    });
    if (!res.ok) {
      return { url, label, error: `HTTP ${res.status}` };
    }
    const ctype = res.headers.get("content-type") ?? "";
    if (ctype.includes("json")) {
      const data = (await res.json()) as Record<string, unknown>;
      return { url, label, facts: { kind: "json", data } };
    }
    const raw = await res.text();
    const text = raw
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return {
      url,
      label,
      facts: { kind: "page", contentType: ctype },
      snippet: text.slice(0, SNIPPET_CHARS),
    };
  } catch (e) {
    return { url, label, error: `fetch failed: ${(e as Error).message}` };
  }
}

function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}
