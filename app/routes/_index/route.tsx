import { useState } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";

import { login } from "../../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const [customerMessage, setCustomerMessage] = useState("");
  const [tone, setTone] = useState("professional");
  const [generatedReply, setGeneratedReply] = useState("");

  const handleGenerateReply = () => {
    // Mock data - no API calls yet
    const mockReplies: Record<string, string> = {
      professional:
        "Thank you for your feedback. We appreciate you taking the time to share your experience with us. We're committed to providing excellent service and will use your comments to improve.",
      friendly:
        "Hey there! Thanks so much for reaching out. We really appreciate your feedback and are so glad you took the time to share your thoughts with us! 😊",
      formal:
        "Dear Valued Customer, We extend our sincere gratitude for your correspondence. Your feedback is of paramount importance to us, and we shall take your comments into careful consideration as we continue to enhance our services.",
      casual:
        "Thanks for the message! We really appreciate your feedback and will definitely keep it in mind. Let us know if there's anything else we can help with!",
    };

    setGeneratedReply(mockReplies[tone] || mockReplies.professional);
  };

  return (
    <s-page heading="AI Review Reply Generator">
      <s-section heading="Customer Message">
        <s-stack direction="block" gap="base">
          <label style={{ display: "block" }}>
            <span style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
              Customer Message
            </span>
            <textarea
              value={customerMessage}
              onChange={(e) => setCustomerMessage(e.target.value)}
              rows={6}
              placeholder="Enter the customer's message or review here..."
              style={{
                width: "100%",
                padding: "8px",
                border: "1px solid #c9cccf",
                borderRadius: "4px",
                fontFamily: "inherit",
                fontSize: "14px",
              }}
            />
          </label>
        </s-stack>
      </s-section>

      <s-section heading="Tone Selection">
        <s-stack direction="block" gap="base">
          <label style={{ display: "block" }}>
            <span style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
              Tone
            </span>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              style={{
                width: "100%",
                padding: "8px",
                border: "1px solid #c9cccf",
                borderRadius: "4px",
                fontFamily: "inherit",
                fontSize: "14px",
              }}
            >
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="formal">Formal</option>
              <option value="casual">Casual</option>
            </select>
          </label>
        </s-stack>
      </s-section>

      <s-section heading="Actions">
        <s-stack direction="block" gap="base">
          <s-button onClick={handleGenerateReply} variant="primary">
            Generate Reply
          </s-button>
        </s-stack>
      </s-section>

      {generatedReply && (
        <s-section heading="Generated Reply">
          <s-stack direction="block" gap="base">
            <label style={{ display: "block" }}>
              <span style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
                Generated Reply
              </span>
              <textarea
                value={generatedReply}
                readOnly
                rows={6}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #c9cccf",
                  borderRadius: "4px",
                  fontFamily: "inherit",
                  fontSize: "14px",
                  backgroundColor: "#f6f6f7",
                }}
              />
            </label>
          </s-stack>
        </s-section>
      )}
    </s-page>
  );
}
