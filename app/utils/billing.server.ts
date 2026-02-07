/**
 * Creates a subscription for a shop
 * @param admin - Shopify Admin API context with graphql method
 * @param shop - Shop domain
 * @param returnUrl - URL to return to after subscription confirmation
 * @returns Confirmation URL for the subscription
 */
export async function createSubscription(
  admin: { graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response> },
  shop: string,
  returnUrl: string,
): Promise<string> {
  const response = await admin.graphql(
    `#graphql
      mutation appSubscriptionCreate($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $returnUrl: URL!, $trialDays: Int!) {
        appSubscriptionCreate(
          name: $name
          lineItems: $lineItems
          returnUrl: $returnUrl
          trialDays: $trialDays
        ) {
          appSubscription {
            id
            status
          }
          confirmationUrl
          userErrors {
            field
            message
          }
        }
      }`,
    {
      variables: {
        name: "pro_monthly",
        lineItems: [
          {
            plan: {
              appRecurringPricingDetails: {
                price: {
                  amount: 5.0,
                  currencyCode: "USD",
                },
                interval: "EVERY_30_DAYS",
              },
            },
          },
        ],
        returnUrl,
        trialDays: 14,
      },
    },
  );

  const responseJson = await response.json();

  if (responseJson.data?.appSubscriptionCreate?.userErrors?.length > 0) {
    const errors = responseJson.data.appSubscriptionCreate.userErrors;
    throw new Error(
      `Failed to create subscription: ${errors.map((e: { message: string }) => e.message).join(", ")}`,
    );
  }

  const confirmationUrl =
    responseJson.data?.appSubscriptionCreate?.confirmationUrl;

  if (!confirmationUrl) {
    throw new Error("No confirmation URL returned from subscription creation");
  }

  return confirmationUrl;
}

/**
 * Checks if a shop has an active subscription
 * @param admin - Shopify Admin API context with graphql method
 * @param shop - Shop domain
 * @returns True if the shop has an active subscription, false otherwise
 */
/**
 * Checks if a shop has an active subscription or valid trial
 * @param admin - Shopify Admin API context with graphql method
 * @param shop - Shop domain
 * @returns Object with hasAccess (boolean) and isTrial (boolean)
 */
export async function checkActiveSubscription(
  admin: { graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response> },
  shop: string,
): Promise<{ hasAccess: boolean; isTrial: boolean; daysRemaining?: number }> {
  const response = await admin.graphql(
    `#graphql
      query currentAppInstallation {
        currentAppInstallation {
          activeSubscriptions {
            id
            status
            name
            createdAt
            trialDays
            currentPeriodEnd
          }
        }
      }`,
  );

  const responseJson = await response.json();
  const subscriptions =
    responseJson.data?.currentAppInstallation?.activeSubscriptions || [];

  // Find subscription with "pro_monthly" key
  const subscription = subscriptions.find(
    (sub: { name: string }) => sub.name === "pro_monthly",
  );

  if (!subscription) {
    return { hasAccess: false, isTrial: false };
  }

  // Check if subscription is ACTIVE (paid)
  if (subscription.status === "ACTIVE") {
    return { hasAccess: true, isTrial: false };
  }

  // Check if in trial period
  if (subscription.status === "ACCEPTED" || subscription.status === "TRIAL") {
    if (!subscription.createdAt) {
      // If createdAt is not available, assume trial is valid (fallback)
      return { hasAccess: true, isTrial: true };
    }

    const createdAt = new Date(subscription.createdAt);
    const trialDays = subscription.trialDays || 14;
    const trialEndDate = new Date(createdAt);
    trialEndDate.setDate(trialEndDate.getDate() + trialDays);
    const now = new Date();

    if (now <= trialEndDate) {
      const daysRemaining = Math.ceil(
        (trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      return { hasAccess: true, isTrial: true, daysRemaining };
    } else {
      // Trial expired
      return { hasAccess: false, isTrial: false };
    }
  }

  return { hasAccess: false, isTrial: false };
}

