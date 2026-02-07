import { useState, useEffect } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { generateAIReply } from "../utils/openai.server";
import {
  checkActiveSubscription,
  createSubscription,
} from "../utils/billing.server";
import { checkAndIncrementUsage, getCurrentUsageCount } from "../utils/usage.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  try {
    const subscriptionStatus = await checkActiveSubscription(admin, shop);

    if (!subscriptionStatus.hasAccess) {
      // Create subscription and get confirmation URL
      try {
        const returnUrl = new URL(request.url).origin + "/app";
        const confirmationUrl = await createSubscription(admin, shop, returnUrl);

        return {
          hasSubscription: false,
          confirmationUrl,
          usageCount: 0,
          isTrial: false,
        };
      } catch (error) {
        // If billing API is not available (e.g., in development), allow access
        console.warn("Billing API not available, allowing access for development:", error);
        try {
          const usageCount = await getCurrentUsageCount(admin);
          return {
            hasSubscription: true, // Allow access in development
            usageCount,
            isTrial: false,
          };
        } catch {
          return {
            hasSubscription: true,
            usageCount: 0,
            isTrial: false,
          };
        }
      }
    }

    // Get current usage count for subscribed shops
    try {
      const usageCount = await getCurrentUsageCount(admin);
      return {
        hasSubscription: true,
        usageCount,
        isTrial: subscriptionStatus.isTrial,
        daysRemaining: subscriptionStatus.daysRemaining,
      };
    } catch {
      return {
        hasSubscription: true,
        usageCount: 0,
        isTrial: subscriptionStatus.isTrial,
        daysRemaining: subscriptionStatus.daysRemaining,
      };
    }
  } catch (error) {
    // If subscription check fails, allow access for development
    console.warn("Subscription check failed, allowing access for development:", error);
    try {
      const usageCount = await getCurrentUsageCount(admin);
      return {
        hasSubscription: true, // Allow access in development
        usageCount,
        isTrial: false,
      };
    } catch {
      return {
        hasSubscription: true,
        usageCount: 0,
        isTrial: false,
      };
    }
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  // Check for active subscription or valid trial before processing
  try {
    const subscriptionStatus = await checkActiveSubscription(admin, shop);

    if (!subscriptionStatus.hasAccess) {
      return {
        reply: "",
        error: "Subscription required. Your trial has expired or no active subscription found.",
      };
    }
  } catch (error) {
    // If subscription check fails (e.g., billing API not available in dev), allow access
    console.warn("Subscription check failed, allowing access for development:", error);
    // Continue without subscription check in development
  }

  const formData = await request.formData();
  const message = formData.get("message") as string;
  const tone = formData.get("tone") as string;

  if (!message || !tone) {
    return { reply: "", error: "Message and tone are required" };
  }

  // Check daily usage limit before calling OpenAI
  try {
    const usageResult = await checkAndIncrementUsage(admin);

    if (!usageResult.allowed) {
      return {
        reply: "",
        error: "Daily limit of 100 replies reached",
      };
    }
  } catch (error) {
    console.error("Error checking usage limit:", error);
    return {
      reply: "",
      error: "Failed to check usage limit. Please try again.",
    };
  }

  // Only call OpenAI if usage limit check passed
  try {
    const reply = await generateAIReply(message, tone);
    return { reply };
  } catch (error) {
    console.error("Error generating AI reply:", error);
    return {
      reply: "",
      error:
        error instanceof Error
          ? error.message
          : "Failed to generate reply. Please try again.",
    };
  }
};

export default function Index() {
  const [customerMessage, setCustomerMessage] = useState("");
  const [tone, setTone] = useState("Polite & Professional");
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const shopify = useAppBridge();

  const generatedReply = actionData?.reply || "";
  const error = actionData?.error;
  const isSubmitting = navigation.state === "submitting";
  const hasSubscription = loaderData?.hasSubscription ?? false;
  const confirmationUrl = loaderData?.confirmationUrl;
  const usageCount = loaderData?.usageCount ?? 0;

  // Show toast notifications for success/errors
  useEffect(() => {
    if (actionData?.reply) {
      shopify.toast.show("Reply generated successfully!");
    }
    if (actionData?.error) {
      shopify.toast.show(actionData.error, { isError: true });
    }
  }, [actionData, shopify]);

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedReply);
      shopify.toast.show("Reply copied to clipboard!");
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = generatedReply;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        shopify.toast.show("Reply copied to clipboard!");
      } catch (fallbackErr) {
        shopify.toast.show("Failed to copy to clipboard", { isError: true });
      }
      document.body.removeChild(textArea);
    }
  };

  const handleStartTrial = () => {
    if (confirmationUrl) {
      window.location.href = confirmationUrl;
    }
  };

  return (
    <s-page heading="AI Review Reply Generator">
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ 
          fontSize: "32px", 
          fontWeight: "600", 
          lineHeight: "40px", 
          marginBottom: "8px",
          marginTop: "0",
          color: "#202223"
        }}>
          AI-Powered Review Replies
        </h1>
        <p style={{ 
          fontSize: "16px", 
          lineHeight: "24px", 
          color: "#6d7175",
          margin: "0"
        }}>
          Generate professional, personalized responses to customer reviews in seconds
        </p>
      </div>

      <div style={{ marginBottom: "24px" }}>
        <s-section heading="How it works">
          <s-stack direction="block" gap="base">
            <s-unordered-list>
              <s-list-item>Paste a customer review or message</s-list-item>
              <s-list-item>Choose the reply tone</s-list-item>
              <s-list-item>Click "Generate Reply"</s-list-item>
              <s-list-item>Copy and post it wherever you respond to customers</s-list-item>
            </s-unordered-list>
            <div style={{ fontSize: "12px", color: "#6d7175", marginTop: "8px" }}>
              💡 Replies are AI-generated drafts. Always review before posting.
            </div>
          </s-stack>
        </s-section>
      </div>

      {!hasSubscription ? (
        <div style={{ marginBottom: "32px" }}>
          <s-section heading="Subscription Required">
            <s-stack direction="block" gap="base">
              <s-paragraph>
                Start your free trial to access the AI Review Reply Generator.
              </s-paragraph>
              <s-stack direction="block" gap="base">
                <s-button onClick={handleStartTrial} variant="primary">
                  Start Free Trial
                </s-button>
                <div style={{ fontSize: "12px", textAlign: "center", color: "#6d7175", marginTop: "4px" }}>
                  7-day free trial · $5/month after
                </div>
              </s-stack>
            </s-stack>
          </s-section>
        </div>
      ) : (
        <Form method="post">
          <div style={{ marginBottom: "32px" }}>
            <s-section heading="Customer message">
              <s-stack direction="block" gap="base">
                <label style={{ display: "block", width: "100%", boxSizing: "border-box" }}>
                  {/* <span style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
                    Customer message
                  </span> */}
                  <textarea
                    name="message"
                    value={customerMessage}
                    onChange={(e) => setCustomerMessage(e.target.value)}
                    rows={6}
                    placeholder="Paste the customer review or message you'd like to respond to..."
                    disabled={isSubmitting}
                    style={{
                      width: "100%",
                      maxWidth: "100%",
                      padding: "8px",
                      border: "1px solid #c9cccf",
                      borderRadius: "4px",
                      fontFamily: "inherit",
                      fontSize: "14px",
                      boxSizing: "border-box",
                      opacity: isSubmitting ? 0.6 : 1,
                      cursor: isSubmitting ? "not-allowed" : "text",
                    }}
                  />
                </label>
              </s-stack>
            </s-section>
          </div>

          <div style={{ marginBottom: "32px" }}>
            <s-section heading="Tone">
              <s-stack direction="block" gap="base">
                <label style={{ display: "block", width: "100%", boxSizing: "border-box" }}>
                  {/* <span style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
                    Tone
                  </span> */}
                  <select
                    name="tone"
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    disabled={isSubmitting}
                    style={{
                      width: "100%",
                      maxWidth: "100%",
                      padding: "8px",
                      border: "1px solid #c9cccf",
                      borderRadius: "4px",
                      fontFamily: "inherit",
                      fontSize: "14px",
                      boxSizing: "border-box",
                      opacity: isSubmitting ? 0.6 : 1,
                      cursor: isSubmitting ? "not-allowed" : "pointer",
                    }}
                  >
                    <option value="Polite & Professional">Polite & Professional</option>
                    <option value="Friendly & Casual">Friendly & Casual</option>
                    <option value="Apologetic & Supportive">Apologetic & Supportive</option>
                  </select>
                </label>
              </s-stack>
            </s-section>
          </div>

          <div style={{ marginBottom: "32px" }}>
            <s-section heading="Actions">
              <s-stack direction="block" gap="base">
                <s-button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting}
                  {...(isSubmitting ? { loading: true } : {})}
                >
                  {isSubmitting ? "Generating..." : "Generate Reply"}
                </s-button>
                <div style={{ 
                  fontSize: "14px", 
                  color: "#6d7175", 
                  textAlign: "center",
                  marginTop: "8px"
                }}>
                  Usage today: {usageCount} / 100 replies
                </div>
              </s-stack>
            </s-section>
          </div>
        </Form>
      )}

      {hasSubscription && error && (
        <div style={{ marginBottom: "32px" }}>
          <s-section heading="Error">
            <s-stack direction="block" gap="base">
              <div
                style={{
                  padding: "12px",
                  border: "1px solid #d72c0d",
                  borderRadius: "4px",
                  backgroundColor: "#fef2f2",
                  color: "#d72c0d",
                }}
              >
                {error}
              </div>
            </s-stack>
          </s-section>
        </div>
      )}

      {hasSubscription && (
        <div style={{ marginBottom: "32px" }}>
          <s-section heading="Generated reply">
            <s-stack direction="block" gap="base">
              <label style={{ display: "block", width: "100%", boxSizing: "border-box" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  {/* <span style={{ fontWeight: "500" }}>
                    Generated reply
                  </span> */}
                  {generatedReply && (
                    <s-button onClick={handleCopyToClipboard} variant="secondary">
                      Copy to clipboard
                    </s-button>
                  )}
                </div>
                <textarea
                  value={generatedReply || ""}
                  readOnly
                  placeholder={generatedReply ? undefined : "Your AI-generated reply will appear here."}
                  rows={6}
                  style={{
                    width: "100%",
                    maxWidth: "100%",
                    padding: "8px",
                    border: "1px solid #c9cccf",
                    borderRadius: "4px",
                    fontFamily: "inherit",
                    fontSize: "14px",
                    backgroundColor: generatedReply ? "#f6f6f7" : "#ffffff",
                    color: generatedReply ? "#202223" : "#6d7175",
                    boxSizing: "border-box",
                  }}
                />
              </label>
            </s-stack>
          </s-section>
        </div>
      )}
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
