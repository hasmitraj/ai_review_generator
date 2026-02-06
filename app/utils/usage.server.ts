/**
 * Daily usage limit helper for AI replies
 * Uses shop metafield to track daily usage count and date
 */

interface DailyUsage {
  count: number;
  date: string; // ISO date string (YYYY-MM-DD)
}

const METAFIELD_NAMESPACE = "ai_reply";
const METAFIELD_KEY = "daily_usage";
const DAILY_LIMIT = 100;

/**
 * Gets today's date as YYYY-MM-DD string
 */
function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Reads the daily usage metafield from shop
 */
async function getDailyUsage(
  admin: { graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response> },
): Promise<DailyUsage | null> {
  const response = await admin.graphql(
    `#graphql
      query getShopMetafield($namespace: String!, $key: String!) {
        shop {
          metafield(namespace: $namespace, key: $key) {
            id
            value
          }
        }
      }`,
    {
      variables: {
        namespace: METAFIELD_NAMESPACE,
        key: METAFIELD_KEY,
      },
    },
  );

  const responseJson = await response.json();
  const metafield = responseJson.data?.shop?.metafield;

  if (!metafield?.value) {
    return null;
  }

  try {
    return JSON.parse(metafield.value) as DailyUsage;
  } catch {
    return null;
  }
}

/**
 * Gets the shop ID
 */
async function getShopId(
  admin: { graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response> },
): Promise<string> {
  const response = await admin.graphql(
    `#graphql
      query getShopId {
        shop {
          id
        }
      }`,
  );

  const responseJson = await response.json();
  const shopId = responseJson.data?.shop?.id;

  if (!shopId) {
    throw new Error("Failed to get shop ID");
  }

  return shopId;
}

/**
 * Saves the daily usage metafield to shop
 */
async function saveDailyUsage(
  admin: { graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response> },
  usage: DailyUsage,
): Promise<void> {
  const shopId = await getShopId(admin);

  const response = await admin.graphql(
    `#graphql
      mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            namespace
            key
          }
          userErrors {
            field
            message
          }
        }
      }`,
    {
      variables: {
        metafields: [
          {
            namespace: METAFIELD_NAMESPACE,
            key: METAFIELD_KEY,
            type: "json",
            value: JSON.stringify(usage),
            ownerId: shopId,
          },
        ],
      },
    },
  );

  const responseJson = await response.json();

  if (responseJson.data?.metafieldsSet?.userErrors?.length > 0) {
    const errors = responseJson.data.metafieldsSet.userErrors;
    throw new Error(
      `Failed to save metafield: ${errors.map((e: { message: string }) => e.message).join(", ")}`,
    );
  }
}

/**
 * Gets the current daily usage count without incrementing
 * @returns Current usage count (0 if no usage today)
 */
export async function getCurrentUsageCount(
  admin: { graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response> },
): Promise<number> {
  const today = getTodayDateString();
  const currentUsage = await getDailyUsage(admin);

  // If no metafield exists or date is not today, return 0
  if (!currentUsage || currentUsage.date !== today) {
    return 0;
  }

  return currentUsage.count;
}

/**
 * Checks and increments daily usage limit
 * @returns true if usage is allowed, false if limit exceeded
 * @throws Error if metafield operation fails
 */
export async function checkAndIncrementUsage(
  admin: { graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response> },
): Promise<{ allowed: boolean; currentCount: number }> {
  const today = getTodayDateString();
  const currentUsage = await getDailyUsage(admin);

  // If no metafield exists or date is not today, reset to 1
  if (!currentUsage || currentUsage.date !== today) {
    const newUsage: DailyUsage = {
      count: 1,
      date: today,
    };
    await saveDailyUsage(admin, newUsage);
    return { allowed: true, currentCount: 1 };
  }

  // If count is at or above limit, deny
  if (currentUsage.count >= DAILY_LIMIT) {
    return { allowed: false, currentCount: currentUsage.count };
  }

  // Increment count and save
  const updatedUsage: DailyUsage = {
    count: currentUsage.count + 1,
    date: today,
  };
  await saveDailyUsage(admin, updatedUsage);

  return { allowed: true, currentCount: updatedUsage.count };
}

