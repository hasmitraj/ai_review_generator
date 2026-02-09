import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function PrivacyPolicy() {
  return (
    <s-page heading="Privacy Policy">
      <s-section heading="Introduction">
        <s-paragraph>
          This Privacy Policy describes how AI Review Reply Generator ("we", "our", or "us") collects, uses, and protects your information when you use our Shopify app.
        </s-paragraph>
      </s-section>

      <s-section heading="Information We Collect">
        <s-paragraph>
          We collect the following types of information:
        </s-paragraph>
        <s-unordered-list>
          <s-list-item>
            <strong>Shop Information:</strong> Your Shopify shop domain and basic shop details necessary for app functionality.
          </s-list-item>
          <s-list-item>
            <strong>Customer Reviews:</strong> Customer reviews and messages that you input into the app for generating AI-powered replies.
          </s-list-item>
          <s-list-item>
            <strong>Usage Data:</strong> Information about how you use the app, including daily usage counts and subscription status.
          </s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section heading="How We Use Your Information">
        <s-paragraph>
          We use the collected information to:
        </s-paragraph>
        <s-unordered-list>
          <s-list-item>Generate AI-powered review replies based on your input</s-list-item>
          <s-list-item>Track usage limits and subscription status</s-list-item>
          <s-list-item>Provide and improve our services</s-list-item>
          <s-list-item>Process subscription payments through Shopify's billing system</s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section heading="Data Processing">
        <s-paragraph>
          When you use our app to generate review replies:
        </s-paragraph>
        <s-unordered-list>
          <s-list-item>
            Customer reviews and messages you input are sent to OpenAI's API for processing
          </s-list-item>
          <s-list-item>
            We do not store your customer reviews or generated replies permanently
          </s-list-item>
          <s-list-item>
            OpenAI processes your data according to their privacy policy. Please review{" "}
            <s-link href="https://openai.com/policies/privacy-policy" target="_blank">
              OpenAI's Privacy Policy
            </s-link>
          </s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section heading="Data Storage">
        <s-paragraph>
          We store the following data:
        </s-paragraph>
        <s-unordered-list>
          <s-list-item>
            <strong>Session Data:</strong> Stored in our database to maintain your app session
          </s-list-item>
          <s-list-item>
            <strong>Usage Metrics:</strong> Daily usage counts stored as shop metafields in Shopify
          </s-list-item>
          <s-list-item>
            <strong>Subscription Information:</strong> Managed through Shopify's billing system
          </s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section heading="Data Security">
        <s-paragraph>
          We implement appropriate technical and organizational measures to protect your information:
        </s-paragraph>
        <s-unordered-list>
          <s-list-item>All data is transmitted over encrypted connections (HTTPS)</s-list-item>
          <s-list-item>Database access is restricted and secured</s-list-item>
          <s-list-item>API keys and sensitive credentials are stored securely</s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section heading="Third-Party Services">
        <s-paragraph>
          Our app integrates with the following third-party services:
        </s-paragraph>
        <s-unordered-list>
          <s-list-item>
            <strong>OpenAI:</strong> For AI-powered reply generation. Their privacy policy applies to data sent to their services.
          </s-list-item>
          <s-list-item>
            <strong>Shopify:</strong> For app hosting, authentication, and billing services.
          </s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section heading="Your Rights">
        <s-paragraph>
          You have the right to:
        </s-paragraph>
        <s-unordered-list>
          <s-list-item>Access your personal data</s-list-item>
          <s-list-item>Request deletion of your data</s-list-item>
          <s-list-item>Uninstall the app at any time, which will remove associated data</s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section heading="Changes to This Policy">
        <s-paragraph>
          We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
        </s-paragraph>
      </s-section>

      <s-section heading="Contact Us">
        <s-paragraph>
          If you have any questions about this Privacy Policy, please contact us through the Shopify App Store or your app developer.
        </s-paragraph>
      </s-section>

      <s-section heading="Last Updated">
        <s-paragraph>
          This Privacy Policy was last updated on {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};


