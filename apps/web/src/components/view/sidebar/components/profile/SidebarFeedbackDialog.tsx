"use client";

import { Button } from "../../../../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../../../../ui/dialog";
import { Label } from "../../../../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../../../../ui/select";
import { Textarea } from "../../../../ui/textarea";

type SidebarFeedbackDialogProps = {
  open: boolean;
  feedbackType: string;
  feedbackMessage: string;
  onOpenChange: (open: boolean) => void;
  onFeedbackTypeChange: (value: string) => void;
  onFeedbackMessageChange: (value: string) => void;
  onSend: () => void;
};

export function SidebarFeedbackDialog({
  open,
  feedbackType,
  feedbackMessage,
  onOpenChange,
  onFeedbackTypeChange,
  onFeedbackMessageChange,
  onSend
}: SidebarFeedbackDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Share feedback</DialogTitle>
          <DialogDescription>
            Tell us what we should improve or build next.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="feedback-type">Type</Label>
            <Select value={feedbackType} onValueChange={onFeedbackTypeChange}>
              <SelectTrigger id="feedback-type">
                <SelectValue placeholder="Select a suggestion type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Bug">Bug</SelectItem>
                <SelectItem value="Feature request">Feature request</SelectItem>
                <SelectItem value="Billing">Billing</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="feedback-message">Suggestion</Label>
            <Textarea
              id="feedback-message"
              placeholder="What should we do better?"
              value={feedbackMessage}
              onChange={(event) => onFeedbackMessageChange(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={onSend} disabled={!feedbackType}>
            Send feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
