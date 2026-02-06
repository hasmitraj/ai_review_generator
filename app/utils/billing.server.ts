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
        name: "AI Review Reply Generator – Starter",
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
        trialDays: 7,
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
export async function checkActiveSubscription(
  admin: { graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response> },
  shop: string,
): Promise<boolean> {
  const response = await admin.graphql(
    `#graphql
      query currentAppInstallation {
        currentAppInstallation {
          activeSubscriptions {
            id
            status
            name
          }
        }
      }`,
  );

  const responseJson = await response.json();
  const subscriptions =
    responseJson.data?.currentAppInstallation?.activeSubscriptions || [];

  // Check if there's an active subscription with the app name
  const activeSubscription = subscriptions.find(
    (sub: { status: string; name: string }) =>
      sub.status === "ACTIVE" &&
      sub.name === "AI Review Reply Generator – Starter",
  );

  return !!activeSubscription;
}

