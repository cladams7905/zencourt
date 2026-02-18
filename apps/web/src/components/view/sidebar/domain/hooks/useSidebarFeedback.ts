import * as React from "react";
import { toast } from "sonner";

export const useSidebarFeedback = () => {
  const [isFeedbackOpen, setIsFeedbackOpen] = React.useState(false);
  const [feedbackType, setFeedbackType] = React.useState("");
  const [feedbackMessage, setFeedbackMessage] = React.useState("");

  const handleFeedbackOpenChange = React.useCallback((open: boolean) => {
    setIsFeedbackOpen(open);
    if (!open) {
      setFeedbackType("");
      setFeedbackMessage("");
    }
  }, []);

  const handleFeedbackSend = React.useCallback(() => {
    if (!feedbackType) {
      toast.error("Please choose a suggestion type before sending.");
      return;
    }

    const subject = `Zencourt feedback (${feedbackType})`;
    const body = [
      `Type: ${feedbackType}`,
      "",
      "Suggestions:",
      feedbackMessage.trim() || "No additional feedback."
    ].join("\n");

    window.location.href = `mailto:team@zencourt.ai?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
    toast.success("Feedback ready to send.");
    handleFeedbackOpenChange(false);
  }, [feedbackMessage, feedbackType, handleFeedbackOpenChange]);

  return {
    isFeedbackOpen,
    feedbackType,
    feedbackMessage,
    setIsFeedbackOpen,
    setFeedbackType,
    setFeedbackMessage,
    handleFeedbackOpenChange,
    handleFeedbackSend
  };
};
