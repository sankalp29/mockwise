/**
 * Free high-level system design prompts (browser-local; no backend).
 * Structure mirrors coding problems: title, description, requirements, constraints, notes.
 */

export const SYSTEM_DESIGN_QUESTIONS = [
  {
    id: 'url-shortener',
    title: 'Design a URL Shortener',
    difficulty: 'Medium',
    summary:
      'Design a service like bit.ly that turns long URLs into short links and redirects users reliably at scale.',
    description: `## Problem

Build a high-level design for a **URL shortener** used by millions of users.

Users paste a long URL and receive a short link (e.g. \`mock.ly/aB3xY\`). Visiting the short link redirects to the original URL with low latency.

## Functional requirements

1. Create a short URL from a long URL (authenticated or anonymous — your call; state assumptions).
2. Redirect short URL → original URL.
3. Optional custom aliases (if available).
4. Basic analytics: click counts (can be eventual).
5. Links should not collide; support deactivation / expiry if you choose.

## Non-functional requirements

- **Read-heavy**: redirects ≫ creates (e.g. 100:1).
- Low latency redirects (p99 under ~100–200ms in-region).
- High availability for redirects.
- Scale to ~100M new links/month and ~10k redirects/sec peak (adjust if you state different numbers).
- Durable storage of mappings.

## Out of scope (unless you have time)

- Full abuse/spam platform, full marketing suite, multi-region active-active detail.

## What to deliver on the whiteboard

1. High-level component diagram (clients, API, services, stores, cache, CDN if any).
2. Write path for creating a short link (encoding / ID generation).
3. Read path for redirect (cache strategy).
4. Data model sketch for the mapping.
5. Scaling & failure notes (hot keys, cache stampede, DB growth).
`,
    constraints: `## Constraints & assumptions to call out

- Character set and length of short codes.
- Whether URLs are permanent or expiring.
- Consistency vs availability tradeoffs on create.
- How you avoid guessing / enumeration of short codes.
`,
    notes: `## Interview tip

Start with requirements and API shape, then data model, then diagram write/read paths, then scale bottlenecks. Label arrows with protocols (HTTPS, gRPC, etc.) where it helps.
`,
  },
  {
    id: 'rate-limiter',
    title: 'Design a Distributed Rate Limiter',
    difficulty: 'Medium',
    summary:
      'Design a rate-limiting service that protects APIs across many gateway instances with predictable limits per client.',
    description: `## Problem

Design a **distributed rate limiter** used by an API platform.

Every request from a client (API key or user id) must be allowed or rejected according to a policy, e.g. **100 requests / minute**, consistently across many stateless API gateway pods.

## Functional requirements

1. Check-and-consume: allow or deny a request for a given key and policy.
2. Support at least one algorithm you can defend (token bucket, sliding window, fixed window, etc.).
3. Multi-instance gateways must share limits (not N× the limit by accident).
4. Configurable limits per API key / plan (config can be simple).

## Non-functional requirements

- Very low added latency on the hot path.
- High availability; fail-open vs fail-closed is a design choice — state it.
- Horizontal scale for gateways.
- Eventual visibility of metrics (optional).

## What to deliver on the whiteboard

1. Where the limiter sits (gateway sidecar, central service, library + Redis, etc.).
2. Hot-path sequence diagram for allow/deny.
3. Store choice and key design.
4. Clock skew, race conditions, and multi-DC notes if relevant.
`,
    constraints: `## Constraints

- Do not assume a single global in-memory map on one server.
- Call out consistency of counts under concurrent requests.
`,
    notes: `## Interview tip

Pick one algorithm, explain correctness, then show the distributed implementation and failure modes.
`,
  },
  {
    id: 'news-feed',
    title: 'Design a News Feed',
    difficulty: 'Hard',
    summary:
      'Design a social news feed: users post content and followers see a ranked stream with acceptable freshness.',
    description: `## Problem

Design a **news feed** for a social product (Twitter/X-style or Facebook-style — pick one and state it).

Users create posts; followers consume a personalized feed. Support fan-out and ranking at a high level.

## Functional requirements

1. Create a post.
2. Follow / unfollow users.
3. Home feed: posts from people you follow (plus ranking if you include it).
4. Pagination / infinite scroll.

## Non-functional requirements

- High read volume on feeds.
- Reasonable freshness (seconds to low minutes).
- Scale to large celebrity fan-out (celebrity problem).
- Storage growth for posts and graphs.

## What to deliver on the whiteboard

1. Entities: users, follows, posts, feed storage.
2. Write path (post create) and read path (feed fetch).
3. Push vs pull vs hybrid fan-out.
4. Caching and ranking service placement.
5. Bottlenecks for mega-followers.
`,
    constraints: `## Constraints

- Assume at least tens of millions of DAU in the steady state you design for.
- Media upload can be a separate service — box it if needed.
`,
    notes: `## Interview tip

Draw push vs pull clearly; call out when hybrid is required for celebrities.
`,
  },
];

export function getSystemDesignQuestion(id) {
  return (
    SYSTEM_DESIGN_QUESTIONS.find((q) => q.id === id) || SYSTEM_DESIGN_QUESTIONS[0]
  );
}

export function getDefaultSystemDesignQuestion() {
  return SYSTEM_DESIGN_QUESTIONS[0];
}

/** Example prompts for a difficulty (Easy / Medium / Hard). */
export function getSystemDesignQuestionsByDifficulty(difficulty) {
  if (!difficulty) return [];
  return SYSTEM_DESIGN_QUESTIONS.filter(
    (q) => q.difficulty.toLowerCase() === String(difficulty).toLowerCase()
  );
}

/**
 * Assign interview prompts the way a real mock does: from the difficulty pool,
 * up to `count` questions, without the candidate choosing which ones.
 */
export function pickSystemDesignQuestions(difficulty, count = 1) {
  const pool = [...getSystemDesignQuestionsByDifficulty(difficulty)];
  if (pool.length === 0) return [];

  // Fisher–Yates shuffle
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const n = Math.max(1, Math.min(Number(count) || 1, pool.length));
  return pool.slice(0, n);
}
